// GET  /api/client/requests -> the signed-in client's cancel/reschedule requests
// POST /api/client/requests { appointment_id, kind:"cancel"|"reschedule", new_date?, new_time?, reason? }
// Creates a PENDING request for the admin to approve. Nothing changes on the booking until then.
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";
import { cancelFeePercent } from "../../_shared/clientExtras";
import { forwardAdminAlertsWhatsApp } from "../../_shared/liveChatWhatsapp";
import { resendPayload } from "../../_shared/emailDeliver";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request); if (user instanceof Response) return user;
  const cid = await resolveOwnCustomerId(env, user);
  if (!cid) return json({ requests: [] }, 200, origin);
  const r = await supaService(env, `booking_requests?customer_id=eq.${cid}&select=*,appointments(appointment_ref,service_name,booking_date,booking_time)&order=created_at.desc&limit=100`, { method: "GET" });
  return json({ requests: r.ok ? await r.json() : [] }, 200, origin);
};

export const onRequestPost: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request); if (user instanceof Response) return user;
  const cid = await resolveOwnCustomerId(env, user);
  if (!cid) return json({ error: "No bookings found for your account." }, 404, origin);
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const kind = b.kind === "reschedule" ? "reschedule" : b.kind === "cancel" ? "cancel" : "";
  if (!kind || !/^[0-9a-f-]{36}$/i.test(String(b.appointment_id || ""))) return json({ error: "Invalid request." }, 400, origin);

  const ar = await supaService(env, `appointments?id=eq.${b.appointment_id}&customer_id=eq.${cid}&select=id,appointment_ref,status,booking_date,booking_time,service_name,total`, { method: "GET" });
  const appt = ar.ok ? ((await ar.json()) as any[])?.[0] : null;
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  if (["cancelled", "completed"].includes(appt.status)) return json({ error: "This booking can no longer be changed." }, 409, origin);
  const pend = await supaService(env, `booking_requests?appointment_id=eq.${appt.id}&status=eq.pending&select=id&limit=1`, { method: "GET" });
  if (pend.ok && ((await pend.json()) as any[]).length) return json({ error: "You already have a pending request for this booking." }, 409, origin);

  let newDate: string | null = null, newTime: string | null = null;
  if (kind === "reschedule") {
    newDate = String(b.new_date || ""); newTime = String(b.new_time || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}/.test(newTime)) return json({ error: "Please choose the new date and time." }, 400, origin);
    const d = new Date(newDate + "T00:00:00+04:00").getTime();
    if (d < Date.now() - 86400e3 || d > Date.now() + 730 * 86400e3) return json({ error: "Please choose a date within the next 2 years." }, 400, origin);
    newTime = newTime.slice(0, 5) + ":00";
  }
  const fee = kind === "cancel" ? cancelFeePercent(appt.booking_date, appt.booking_time) : 0;
  const reason = String(b.reason || "").replace(/[\u0000-\u001f]/g, " ").slice(0, 500);

  const ins = await supaService(env, "booking_requests", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ appointment_id: appt.id, customer_id: cid, kind, new_date: newDate, new_time: newTime, reason, fee_percent: fee }) });
  if (!ins.ok) return json({ error: "Could not send your request. Please try again.", detail: (await ins.text()).slice(0, 200) }, 500, origin);

  const alert = `📝 CLIENT ${kind === "cancel" ? "CANCELLATION" : "RESCHEDULE"} REQUEST\n\nBooking: ${appt.appointment_ref} (${appt.service_name})\nCurrent: ${appt.booking_date} ${String(appt.booking_time).slice(0, 5)}${kind === "reschedule" ? `\nRequested: ${newDate} ${newTime!.slice(0, 5)}` : `\nFee per terms: ${fee}%`}\nReason: ${reason || "-"}\n\nApprove in CMS → Client Requests: https://bynaveedanjum.com/?admin=1`;
  try { await forwardAdminAlertsWhatsApp(env, alert); } catch {}
  try { if ((env as any).RESEND_API_KEY) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${(env as any).RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env, "booking@bynaveedanjum.com", `Client ${kind} request — ${appt.appointment_ref}`, `<pre style="font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap">${alert.replace(/</g, "&lt;")}</pre>`)) }); } catch {}
  return json({ ok: true, fee_percent: fee }, 200, origin);
};
