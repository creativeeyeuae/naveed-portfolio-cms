// POST /api/admin/bookings/:id/confirm   body: { mark_paid?: boolean, note?: string }
//
// Manual verification: the admin confirms a booking directly (e.g. paid in cash, by card in
// person, or agreed by phone) -- previously the only route to "confirmed" was approving an
// uploaded bank-transfer receipt. Optionally also records the payment as paid (and the invoice).
// Then notifies the client automatically: client-portal message + WhatsApp + email.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { notifyAllAdmins, type PushEnv } from "../../../../_shared/webpush";
import { forwardClientWhatsAppAlert } from "../../../../_shared/liveChatWhatsapp";
import { emailBookingUpdate, whatsappBookingUpdate } from "../../../../_shared/bookingNotify";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv & PushEnv> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const appointmentId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as { mark_paid?: boolean; note?: string };
  const note = String(body.note || "").trim().slice(0, 500);

  const getRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}&select=*,customers(full_name,whatsapp,phone),payments(*)`, { method: "GET" });
  const appt = getRes.ok ? ((await getRes.json()) as any[])?.[0] : null;
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  if (appt.status === "cancelled") return json({ error: "This booking is cancelled — create a new booking instead." }, 409, origin);
  if (appt.status === "completed") return json({ error: "This booking is already completed." }, 409, origin);

  const nowIso = new Date().toISOString();
  const wasConfirmed = appt.status === "confirmed";
  if (!wasConfirmed) {
    const patchRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "confirmed", updated_at: nowIso }),
    });
    if (!patchRes.ok) return json({ error: "Could not confirm the booking.", detail: await patchRes.text() }, 500, origin);
    await supaAdmin(env, "appointment_status_history", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ appointment_id: appointmentId, old_status: appt.status, new_status: "confirmed", changed_by: `admin:${admin.email}`, reason: note || (body.mark_paid ? "Verified by admin — payment received" : "Verified by admin") }),
    });
  }

  // Optional: record the payment as received (cash / card / transfer checked by hand).
  let paid = false;
  if (body.mark_paid) {
    const payment = (appt.payments || [])[0];
    if (payment && payment.status !== "paid") {
      const pr = await supaAdmin(env, `payments?id=eq.${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid", receipt_status: payment.receipt_path ? "approved" : payment.receipt_status, verified_by: admin.email, verified_at: nowIso, updated_at: nowIso }),
      });
      paid = pr.ok;
      if (paid) {
        await supaAdmin(env, "invoices", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ appointment_id: appointmentId, invoice_number: `INV-${appointmentId.slice(0, 8).toUpperCase()}`, status: "paid", base_amount: payment.base_amount, transaction_fee: payment.transaction_fee, total: payment.total, currency: payment.currency, payment_method: payment.method, payment_status: "paid" }),
        }).catch(() => {});
      }
    } else if (payment?.status === "paid") paid = true;
  }

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "booking_confirmed", entity_type: "appointment", entity_id: appointmentId, details: { mark_paid: !!body.mark_paid, paid, note } }),
  });

  const ref = appt.appointment_ref || appointmentId.slice(0, 8);
  const cust = appt.customers;
  let whatsapp = "skipped";
  if (appt.customer_id) {
    await supaAdmin(env, "client_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ customer_id: appt.customer_id, sender: "admin", sender_name: admin.email, body: `✅ Your booking (${ref}) is confirmed for ${appt.booking_date || ""} at ${appt.booking_time || ""}.${paid ? " Payment received — thank you!" : ""}`, is_read_by_admin: true, is_read_by_client: false }),
    }).catch(() => {});
    whatsapp = await whatsappBookingUpdate(env, appointmentId, "confirmed", { paid });
  }
  const email = await emailBookingUpdate(env, appointmentId, "confirmed");

  await notifyAllAdmins(env, { title: "Booking confirmed", body: `${cust?.full_name || "A booking"} — ${ref}`, url: "/?admin=1" }).catch(() => {});

  return json({ ok: true, paid, notified: { whatsapp, email } }, 200, origin);
};
