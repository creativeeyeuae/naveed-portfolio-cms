// POST /api/admin/bookings/:id/reschedule   body: { booking_date, booking_time, reason? }
//
// Moves a booking to a new date/time. Does not touch payment status. Never used on a
// cancelled or completed booking -- those are terminal states, same rule as cancel/complete.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { notifyAllAdmins, type PushEnv } from "../../../../_shared/webpush";
import { forwardClientWhatsAppAlert } from "../../../../_shared/liveChatWhatsapp";
import { emailBookingUpdate } from "../../../../_shared/bookingNotify";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv & PushEnv> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const appointmentId = params.id as string;
  let bookingDate = "";
  let bookingTime = "";
  let reason = "";
  try {
    const body = (await request.json()) as { booking_date?: string; booking_time?: string; reason?: string };
    bookingDate = String(body.booking_date || "").trim();
    bookingTime = String(body.booking_time || "").trim();
    reason = (body.reason || "").trim();
  } catch {}
  if (!bookingDate || !bookingTime) return json({ error: "A new date and time are required." }, 400, origin);

  const getRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}&select=*,customers(full_name,email,whatsapp,phone)`, {
    method: "GET",
  });
  const rows = (await getRes.json()) as any[];
  const appt = rows?.[0];
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  if (appt.status === "cancelled" || appt.status === "completed") {
    return json({ error: `Cannot reschedule a booking that is already ${appt.status}.` }, 409, origin);
  }

  const oldDate = appt.booking_date;
  const oldTime = appt.booking_time;
  const nowIso = new Date().toISOString();

  const patchRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({
      booking_date: bookingDate,
      booking_time: bookingTime,
      updated_at: nowIso,
    }),
  });
  if (!patchRes.ok) return json({ error: "Could not reschedule booking.", detail: await patchRes.text() }, 500, origin);

  const historyReason = reason || `Rescheduled from ${oldDate} ${oldTime} to ${bookingDate} ${bookingTime}`;
  await supaAdmin(env, "appointment_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      appointment_id: appointmentId,
      old_status: appt.status,
      new_status: appt.status,
      changed_by: `admin:${admin.email}`,
      reason: historyReason,
    }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "booking_rescheduled",
      entity_type: "appointment",
      entity_id: appointmentId,
      details: { old_date: oldDate, old_time: oldTime, new_date: bookingDate, new_time: bookingTime, reason },
    }),
  });

  // Let the client know via their existing message thread -- no new notification system.
  if (appt.customer_id) {
    await supaAdmin(env, "client_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        customer_id: appt.customer_id,
        sender: "admin",
        sender_name: admin.email,
        body: `Your booking (${appt.appointment_ref || appointmentId.slice(0, 8)}) has been rescheduled to ${bookingDate} at ${bookingTime}.${reason ? ` Note: ${reason}` : ""}`,
        is_read_by_admin: true,
        is_read_by_client: false,
      }),
    });

    // Best-effort: also let the client know on their own WhatsApp. Never blocks the
    // reschedule itself.
    try {
      const cust = appt.customers;
      await forwardClientWhatsAppAlert(
        env,
        cust?.whatsapp || cust?.phone,
        `📅 Hi ${cust?.full_name || ""}, your booking (${appt.appointment_ref || appointmentId.slice(0, 8)}) has been *rescheduled* to ${bookingDate} at ${bookingTime}.${reason ? ` Note: ${reason}` : ""}`,
        cust?.full_name
      );
    } catch {}
  }

  await notifyAllAdmins(env, {
    title: "Booking rescheduled",
    body: `${appt.customers?.full_name || "A booking"} moved to ${bookingDate} ${bookingTime}`,
    url: "/?admin=1",
  });

  // Automatic client email (saved Email Designer template if present, else built-in design).

  const emailed = await emailBookingUpdate(env, appointmentId, "rescheduled");

  return json({ ok: true , notified: { email: emailed } }, 200, origin);
};
