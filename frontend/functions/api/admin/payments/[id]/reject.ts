// POST /api/admin/payments/:id/reject   body: { reason: string }
//
// Marks a bank-transfer payment as rejected (e.g. wrong amount, unreadable receipt) and the
// booking as "payment_rejected", with a required reason the client can see so they know why
// and can re-upload. Never deletes the booking -- see the audit/status-history rule.
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
  let reason = "";
  try {
    const body = (await request.json()) as { reason?: string };
    reason = (body.reason || "").trim();
  } catch {}
  if (!reason) return json({ error: "A rejection reason is required." }, 400, origin);

  const getRes = await supaAdmin(env, `payments?id=eq.${paymentId}&select=*`, { method: "GET" });
  const rows = (await getRes.json()) as any[];
  const payment = rows?.[0];
  if (!payment) return json({ error: "Payment not found." }, 404, origin);

  const nowIso = new Date().toISOString();
  const payRes = await supaAdmin(env, `payments?id=eq.${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "rejected",
      receipt_status: "rejected",
      rejection_reason: reason,
      verified_by: admin.email,
      verified_at: nowIso,
      updated_at: nowIso,
    }),
  });
  if (!payRes.ok) return json({ error: "Could not update payment.", detail: await payRes.text() }, 500, origin);

  const apptRes = await supaAdmin(env, `appointments?id=eq.${payment.appointment_id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "payment_rejected", admin_notes: reason, updated_at: nowIso }),
  });
  if (!apptRes.ok) return json({ error: "Payment rejected, but the booking status update failed.", detail: await apptRes.text() }, 500, origin);

  await supaAdmin(env, "appointment_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      appointment_id: payment.appointment_id,
      old_status: "pending_verification",
      new_status: "payment_rejected",
      changed_by: `admin:${admin.email}`,
      reason,
    }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "payment_rejected",
      entity_type: "payment",
      entity_id: paymentId,
      details: { appointment_id: payment.appointment_id, reason },
    }),
  });

  await notifyAllAdmins(env, {
    title: "Booking payment rejected",
    body: `Reason: ${reason}`,
    url: "/?admin=1",
  });

  return json({ ok: true }, 200, origin);
};
