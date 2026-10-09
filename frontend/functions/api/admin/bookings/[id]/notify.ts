// POST /api/admin/bookings/:id/notify -- re-send the client notification (WhatsApp + email)
// for the booking's CURRENT status. Used when the first notification didn't arrive (e.g. the
// phone number was saved in local format, or WhatsApp was disconnected at the time).
// Returns the exact international number it was queued to, so the admin can see it.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { forwardClientWhatsAppAlert } from "../../../../_shared/liveChatWhatsapp";
import { emailBookingUpdate, type BookingEvent } from "../../../../_shared/bookingNotify";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const id = params.id as string;
  const r = await supaAdmin(env, `appointments?id=eq.${encodeURIComponent(id)}&select=*,customers(full_name,whatsapp,phone,email)`, { method: "GET" });
  const appt = r.ok ? ((await r.json()) as any[])?.[0] : null;
  if (!appt) return json({ error: "Booking not found." }, 404, origin);

  const cust = appt.customers || {};
  const name = cust.full_name || "";
  const ref = appt.appointment_ref || id.slice(0, 8);
  const when = `${appt.booking_date || ""} at ${appt.booking_time || ""}`;
  const reason = appt.admin_notes ? `\n\nReason: ${appt.admin_notes}` : "";

  const byStatus: Record<string, { event: BookingEvent; text: string } | undefined> = {
    confirmed: { event: "confirmed", text: `✅ Hi ${name}, your booking *${ref}* is *confirmed* for ${when}.\n\nLooking forward to working with you! 📸 — Naveed Anjum` },
    cancelled: { event: "cancelled", text: `❌ Hi ${name}, your booking *${ref}* has been *cancelled*.${reason}\n\nIf you have any questions, just reply here.` },
    completed: { event: "completed", text: `🎉 Hi ${name}, thank you for choosing me for your project (*${ref}*)! It was a pleasure working with you. — Naveed Anjum` },
    payment_rejected: { event: "payment_rejected", text: `⚠️ Hi ${name}, we couldn't verify the payment for booking *${ref}* yet.${reason}\n\nPlease upload a new receipt from your client page or reply here.` },
  };
  const plan = byStatus[appt.status];
  if (!plan) return json({ error: `Nothing to send for a booking that is "${appt.status}". Confirm it first.` }, 409, origin);

  const phoneUsed = await forwardClientWhatsAppAlert(env, cust.whatsapp || cust.phone, plan.text, name).catch(() => "");
  const email = await emailBookingUpdate(env, id, plan.event);

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "booking_notification_resent", entity_type: "appointment", entity_id: id, details: { status: appt.status, whatsapp_to: phoneUsed || null, email } }),
  }).catch(() => {});

  return json({ ok: true, notified: { whatsapp: phoneUsed ? `+${phoneUsed}` : "", email }, raw_phone: cust.whatsapp || cust.phone || "" }, 200, origin);
};
