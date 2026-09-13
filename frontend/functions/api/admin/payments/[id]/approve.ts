// POST /api/admin/payments/:id/approve
//
// The ONLY place in this whole system that is allowed to turn a payment into "paid" and a
// booking into "confirmed". No page in the browser -- including the admin CMS itself -- can
// do this directly; it can only call this endpoint, which re-checks the admin's identity
// server-side and then does the write with the service-role key.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { notifyAllAdmins, type PushEnv } from "../../../../_shared/webpush";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv & PushEnv> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const paymentId = params.id as string;
  const nowIso = new Date().toISOString();

  // Load the payment first so we know which appointment it belongs to, and so a
  // double-click / retry can't approve an already-approved payment twice.
  const getRes = await supaAdmin(env, `payments?id=eq.${paymentId}&select=*`, { method: "GET" });
  const rows = (await getRes.json()) as any[];
  const payment = rows?.[0];
  if (!payment) return json({ error: "Payment not found." }, 404, origin);
  if (payment.status === "paid") return json({ error: "Already approved." }, 409, origin);

  const payRes = await supaAdmin(env, `payments?id=eq.${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "paid",
      receipt_status: "approved",
      verified_by: admin.email,
      verified_at: nowIso,
      updated_at: nowIso,
    }),
  });
  if (!payRes.ok) return json({ error: "Could not update payment.", detail: await payRes.text() }, 500, origin);

  const apptRes = await supaAdmin(env, `appointments?id=eq.${payment.appointment_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "confirmed", updated_at: nowIso }),
  });
  if (!apptRes.ok) return json({ error: "Payment approved, but the booking status update failed.", detail: await apptRes.text() }, 500, origin);

  // Invoice: create if missing, otherwise mark paid.
  const invNumber = `INV-${payment.appointment_id.slice(0, 8).toUpperCase()}`;
  await supaAdmin(env, "invoices", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      appointment_id: payment.appointment_id,
      invoice_number: invNumber,
      status: "paid",
      base_amount: payment.base_amount,
      transaction_fee: payment.transaction_fee,
      total: payment.total,
      currency: payment.currency,
      payment_method: payment.method,
      payment_status: "paid",
    }),
  });

  await supaAdmin(env, "appointment_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      appointment_id: payment.appointment_id,
      old_status: "pending_verification",
      new_status: "confirmed",
      changed_by: `admin:${admin.email}`,
      reason: "Bank transfer receipt approved",
    }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "payment_approved",
      entity_type: "payment",
      entity_id: paymentId,
      details: { appointment_id: payment.appointment_id, amount: payment.total },
    }),
  });

  await notifyAllAdmins(env, {
    title: "Booking confirmed",
    body: `Payment verified — booking is now confirmed. AED ${payment.total}`,
    url: "/?admin=1",
  });

  return json({ ok: true }, 200, origin);
};
