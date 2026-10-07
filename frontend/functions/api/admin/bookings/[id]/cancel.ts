// POST /api/admin/bookings/:id/cancel   body: { reason: string }
//
// Marks a booking cancelled. Never deletes it -- same audit/status-history rule as the
// payment approve/reject endpoints. A required reason is stored and shown to the client.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { notifyAllAdmins, type PushEnv } from "../../../../_shared/webpush";
import { forwardClientWhatsAppAlert } from "../../../../_shared/liveChatWhatsapp";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv & PushEnv> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const appointmentId = params.id as string;
  let reason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reason = (body.reason || "").trim();
  } catch {}
  if (!reason) return json({ error: "A cancellation reason is required." }, 400, origin);

  const getRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}&select=*,customers(full_name,whatsapp,phone)`, {
    method: "GET",
  });
  const rows = (await getRes.json()) as any[];
  const appt = rows?.[0];
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  if (appt.status === "cancelled") return json({ error: "Already cancelled." }, 409, origin);
  if (appt.status === "completed") return json({ error: "Cannot cancel a completed booking." }, 409, origin);

  const nowIso = new Date().toISOString();
  const patchRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled", admin_notes: reason, updated_at: nowIso }),
  });
  if (!patchRes.ok) return json({ error: "Could not cancel booking.", detail: await patchRes.text() }, 500, origin);

  await supaAdmin(env, "appointment_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      appointment_id: appointmentId,
      old_status: appt.status,
      new_status: "cancelled",
      changed_by: `admin:${admin.email}`,
      reason,
    }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "booking_cancelled",
      entity_type: "appointment",
      entity_id: appointmentId,
      details: { reason },
    }),
  });

  if (appt.customer_id) {
    await supaAdmin(env, "client_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        customer_id: appt.customer_id,
        sender: "admin",
        sender_name: admin.email,
        body: `Your booking (${appt.appointment_ref || appointmentId.slice(0, 8)}) has been cancelled. Reason: ${reason}`,
        is_read_by_admin: true,
        is_read_by_client: false,
      }),
    });

    // Best-effort: also let the client know on their own WhatsApp. Never blocks the
    // cancellation itself.
    try {
      const cust = appt.customers;
      await forwardClientWhatsAppAlert(
        env,
        cust?.whatsapp || cust?.phone,
        `❌ Hi ${cust?.full_name || ""}, your booking (${appt.appointment_ref || appointmentId.slice(0, 8)}) has been *cancelled*.\n\nReason: ${reason}\n\nIf you have any questions, just reply here.`,
        cust?.full_name
      );
    } catch {}
  }

  await notifyAllAdmins(env, {
    title: "Booking cancelled",
    body: `${appt.customers?.full_name || "A booking"} — ${reason}`,
    url: "/?admin=1",
  });

  return json({ ok: true }, 200, origin);
};
