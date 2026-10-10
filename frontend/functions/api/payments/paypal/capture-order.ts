// POST /api/payments/paypal/capture-order   body: { appointment_id, order_id }
// Captures the PayPal order server-side and ONLY THEN marks the existing booking paid.
// Never trusts the browser: the order must be the one created for this booking, and PayPal's
// own response must say COMPLETED for the exact USD amount and this booking's custom_id.
// Idempotent: a retry / double click / second tab can never create a second paid record.
import { json, corsHeaders, supaAdmin } from "../../../_shared/adminAuth";
import { notifyAllAdmins } from "../../../_shared/webpush";
import { emailBookingUpdate, whatsappBookingUpdate } from "../../../_shared/bookingNotify";
import { forwardAdminAlertsWhatsApp } from "../../../_shared/liveChatWhatsapp";
import { resendPayload } from "../../../_shared/emailDeliver";
import { paypalConfigured, paypalToken, paypalApi, usdFromAed, loadPayableBooking } from "../../../_shared/paypal";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  if (!paypalConfigured(env)) return json({ error: "Online payment is not available." }, 503, origin);
  let body: any; try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const orderId = String(body?.order_id || "");
  if (!/^[A-Z0-9]{8,40}$/i.test(orderId)) return json({ error: "Invalid payment reference." }, 400, origin);

  const loaded = await loadPayableBooking(env, String(body?.appointment_id || ""));
  if ("error" in loaded) return json({ error: loaded.error }, loaded.code, origin);
  const { appt, payment } = loaded;
  if (payment.status === "paid") return json({ ok: true, already: true, ref: appt.appointment_ref }, 200, origin);
  // The order must be the one this server created for THIS booking.
  if (payment.provider_txn_id !== `order:${orderId}`) return json({ error: "Payment does not match this booking." }, 400, origin);

  const usd = usdFromAed(appt.total);
  const token = await paypalToken(env);
  let cap = await paypalApi(env, token, `/v2/checkout/orders/${orderId}/capture`, { method: "POST", requestId: `capture-${orderId}`, body: "{}" });
  const issue = cap.body?.details?.[0]?.issue;
  if (!cap.ok && issue === "ORDER_ALREADY_CAPTURED") cap = await paypalApi(env, token, `/v2/checkout/orders/${orderId}`, { method: "GET" });
  if (!cap.ok) {
    if (issue === "INSTRUMENT_DECLINED") return json({ error: "Your payment method was declined. Please try another card or PayPal account.", retry: true }, 402, origin);
    return json({ error: "PayPal could not complete the payment. You have not been charged.", detail: issue || cap.status }, 502, origin);
  }

  const order = cap.body;
  const pu = order?.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];
  const okAmount = capture?.amount?.currency_code === "USD" && capture?.amount?.value === usd;
  const okBooking = pu?.custom_id === appt.id;
  if (capture?.status === "PENDING") return json({ pending: true, message: "PayPal is still processing your payment. We'll confirm your booking as soon as it clears." }, 202, origin);
  if (order?.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !okAmount || !okBooking) {
    await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: "paypal", action: "paypal_capture_mismatch", entity_type: "payment", entity_id: payment.id, details: { order_id: orderId, status: order?.status, capture_status: capture?.status, amount: capture?.amount, expected_usd: usd, custom_id: pu?.custom_id } }) }).catch(() => {});
    return json({ error: "Payment could not be verified. Please contact us with your booking reference." }, 400, origin);
  }

  // Atomic: only the first request flips this payment to paid (status=neq.paid guard).
  const nowIso = new Date().toISOString();
  const upd = await supaAdmin(env, `payments?id=eq.${payment.id}&status=neq.paid`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "paid", provider: "paypal", provider_txn_id: capture.id, verified_by: "paypal", verified_at: nowIso, updated_at: nowIso }),
  });
  const updatedRows = upd.ok ? ((await upd.json()) as any[]) : [];
  if (!updatedRows.length) return json({ ok: true, already: true, ref: appt.appointment_ref }, 200, origin);

  const oldStatus = appt.status;
  await supaAdmin(env, `appointments?id=eq.${appt.id}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed", updated_at: nowIso }) });
  await supaAdmin(env, "invoices", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ appointment_id: appt.id, invoice_number: `INV-${appt.id.slice(0, 8).toUpperCase()}`, status: "paid", base_amount: payment.base_amount, transaction_fee: payment.transaction_fee, total: payment.total, currency: payment.currency, payment_method: "paypal", payment_status: "paid" }),
  }).catch(() => {});
  await supaAdmin(env, "appointment_status_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: appt.id, old_status: oldStatus, new_status: "confirmed", changed_by: "paypal", reason: `PayPal payment captured (${capture.id})` }) }).catch(() => {});
  await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: "paypal", action: "paypal_payment_captured", entity_type: "payment", entity_id: payment.id, details: { appointment_id: appt.id, order_id: orderId, capture_id: capture.id, usd, aed: appt.total, env: env.PAYPAL_ENV || "sandbox" } }) }).catch(() => {});

  try { await notifyAllAdmins(env, { title: "PayPal payment received", body: `${appt.appointment_ref} paid USD ${usd} (AED ${appt.total}) — booking confirmed`, url: "/?admin=1" }); } catch {}
  // Now that it's paid: the "new booking" alert to Naveed (WhatsApp + email) -- sent only here
  // for online payments, so abandoned/unpaid checkouts never trigger alerts.
  const alert = `🔔 NEW PAID BOOKING — Naveed Anjum\n\n🎯 ${appt.service_name || "-"}${appt.package_name ? " (" + appt.package_name + ")" : ""}\n💳 Paid online: USD ${usd} (AED ${appt.total})\nRef: ${appt.appointment_ref}\n\n🔗 https://bynaveedanjum.com/?admin=1`;
  try { await forwardAdminAlertsWhatsApp(env, alert); } catch {}
  try {
    if (env.RESEND_API_KEY) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env, "booking@bynaveedanjum.com", `New paid booking — ${appt.appointment_ref}`, `<pre style="font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap">${alert.replace(/</g, "&lt;")}</pre>`)) });
  } catch {}
  try { await whatsappBookingUpdate(env, appt.id, "confirmed", { paid: true }); } catch {}
  try { await emailBookingUpdate(env, appt.id, "confirmed"); } catch {}

  return json({ ok: true, ref: appt.appointment_ref, capture_id: capture.id }, 200, origin);
};
