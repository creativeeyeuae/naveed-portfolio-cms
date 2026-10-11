// POST /api/admin/bookings/:id/update  { action, ... }
//
// Extra admin booking controls (Bookings tab), alongside confirm/cancel/reschedule/complete:
//   edit    { fields:{service_name,package_name,booking_date,booking_time,total}, notify }
//   start   -- shoot / work has started (stage "in_progress")
//   hold    { reason, note, notify } -- paused by an emergency, accident, illness, weather,
//           animal/venue issue, equipment failure... (stage "on_hold")
//   resume  -- back on track after a hold
//   reopen  -- a cancelled booking goes back to "pending"
//   undo_complete -- a completed booking goes back to "confirmed"
//   delete  { confirm:"DELETE" } -- permanently removes a cancelled / pending / rejected booking
//
// The live "stage" (in progress / on hold) is stored in audit_log (action "booking_stage") so
// no database change is needed; GET /api/admin/bookings attaches it to each booking.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const clean = (v: any, n = 200) => String(v ?? "").trim().slice(0, n);

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = String(params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Bad booking id." }, 400, origin);
  const b = (await request.json().catch(() => ({}))) as any;

  const g = await supaAdmin(env, `appointments?id=eq.${id}&select=*`, { method: "GET" });
  const appt = g.ok ? ((await g.json()) as any[])?.[0] : null;
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  const ref = appt.appointment_ref || id.slice(0, 8);
  const actor = `admin:${admin.email}`;

  const log = (action: string, details: any) =>
    supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor, action, entity_type: "appointment", entity_id: id, details }) });
  const history = (oldS: string, newS: string, reason: string) =>
    supaAdmin(env, "appointment_status_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: id, old_status: oldS, new_status: newS, changed_by: actor, reason }) });
  const tellClient = async (text: string) => {
    if (!appt.customer_id) return false;
    const r = await supaAdmin(env, "client_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_id: appt.customer_id, sender: "admin", sender_name: admin.email, body: text, is_read_by_admin: true, is_read_by_client: false }) });
    return r.ok;
  };
  const setStatus = async (status: string) => {
    const r = await supaAdmin(env, `appointments?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error(await r.text());
  };

  try {
    switch (b.action) {
      case "edit": {
        const f = b.fields || {}; const patch: any = {};
        if (f.service_name !== undefined) patch.service_name = clean(f.service_name, 120) || null;
        if (f.package_name !== undefined) patch.package_name = clean(f.package_name, 120) || null;
        if (f.booking_date !== undefined) { if (f.booking_date && !/^\d{4}-\d{2}-\d{2}$/.test(f.booking_date)) return json({ error: "Date must be YYYY-MM-DD." }, 400, origin); patch.booking_date = f.booking_date || null; }
        if (f.booking_time !== undefined) patch.booking_time = clean(f.booking_time, 10) || null;
        if (f.total !== undefined && f.total !== "") { const t = Number(f.total); if (!isFinite(t) || t < 0) return json({ error: "Total must be a number." }, 400, origin); patch.total = t; }
        if (!Object.keys(patch).length) return json({ error: "Nothing to change." }, 400, origin);
        patch.updated_at = new Date().toISOString();
        const r = await supaAdmin(env, `appointments?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        if (!r.ok) return json({ error: "Could not save changes.", detail: await r.text() }, 500, origin);
        await log("booking_edited", { before: Object.fromEntries(Object.keys(patch).filter((k) => k !== "updated_at").map((k) => [k, appt[k]])), after: patch });
        let told = false;
        if (b.notify) told = await tellClient(`Your booking ${ref} has been updated: ${[patch.service_name && `service ${patch.service_name}`, patch.package_name && `package ${patch.package_name}`, patch.booking_date && `date ${patch.booking_date}`, patch.booking_time && `time ${patch.booking_time}`, patch.total !== undefined && `total AED ${patch.total}`].filter(Boolean).join(", ")}. Reply here if anything looks wrong.`);
        return json({ ok: true, message: `Booking updated${told ? " — client notified" : ""}.` }, 200, origin);
      }
      case "start": {
        if (appt.status !== "confirmed") return json({ error: "Only a confirmed booking can be started." }, 409, origin);
        await log("booking_stage", { stage: "in_progress" }); await history("confirmed", "confirmed", "Shoot started");
        if (b.notify) await tellClient(`We've started your shoot (${ref}). Thank you!`);
        return json({ ok: true, stage: "in_progress", message: "Marked as started." }, 200, origin);
      }
      case "hold": {
        if (["cancelled", "completed"].includes(appt.status)) return json({ error: "This booking is already closed." }, 409, origin);
        const reason = clean(b.reason, 80) || "Unexpected issue"; const note = clean(b.note, 500);
        await log("booking_stage", { stage: "on_hold", reason, note }); await history(appt.status, appt.status, `On hold: ${reason}${note ? ` — ${note}` : ""}`);
        let told = false;
        if (b.notify) told = await tellClient(`Important update on your booking ${ref}: we've had to pause it (${reason}).${note ? ` ${note}` : ""} We're sorry for the inconvenience — we'll contact you shortly to agree a new time. Nothing is lost and no extra charge applies.`);
        return json({ ok: true, stage: "on_hold", message: `Put on hold (${reason})${told ? " — client notified" : ""}.` }, 200, origin);
      }
      case "resume": {
        await log("booking_stage", { stage: "" }); await history(appt.status, appt.status, "Resumed after hold");
        if (b.notify) await tellClient(`Good news — your booking ${ref} is back on track. Thank you for your patience!`);
        return json({ ok: true, stage: "", message: "Resumed." }, 200, origin);
      }
      case "reopen": {
        if (appt.status !== "cancelled") return json({ error: "Only a cancelled booking can be reopened." }, 409, origin);
        await setStatus("pending"); await history("cancelled", "pending", "Reopened by admin"); await log("booking_reopened", {});
        return json({ ok: true, message: "Reopened — now pending. Confirm it when ready." }, 200, origin);
      }
      case "undo_complete": {
        if (appt.status !== "completed") return json({ error: "Booking is not completed." }, 409, origin);
        await setStatus("confirmed"); await history("completed", "confirmed", "Completion undone by admin"); await log("booking_uncompleted", {});
        return json({ ok: true, message: "Back to confirmed." }, 200, origin);
      }
      case "delete": {
        if (b.confirm !== "DELETE") return json({ error: 'Type DELETE to confirm.' }, 400, origin);
        if (!["cancelled", "pending", "payment_rejected", "pending_verification"].includes(appt.status)) return json({ error: "Only cancelled, pending or rejected bookings can be deleted. Cancel it first." }, 409, origin);
        const p = await supaAdmin(env, `payments?appointment_id=eq.${id}&status=eq.paid&select=id`, { method: "GET" });
        if (p.ok && ((await p.json()) as any[]).length) return json({ error: "This booking has a paid payment — refund/cancel it instead of deleting, so your records stay correct." }, 409, origin);
        await log("booking_deleted", { snapshot: appt });
        await supaAdmin(env, `appointment_status_history?appointment_id=eq.${id}`, { method: "DELETE" });
        await supaAdmin(env, `payments?appointment_id=eq.${id}`, { method: "DELETE" });
        const r = await supaAdmin(env, `appointments?id=eq.${id}`, { method: "DELETE" });
        if (!r.ok) return json({ error: "Could not delete.", detail: await r.text() }, 500, origin);
        return json({ ok: true, deleted: true, message: `Booking ${ref} deleted.` }, 200, origin);
      }
      default:
        return json({ error: "Unknown action." }, 400, origin);
    }
  } catch (e: any) {
    return json({ error: e?.message || "Update failed." }, 500, origin);
  }
};
