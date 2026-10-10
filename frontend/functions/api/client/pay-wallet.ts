// POST /api/client/pay-wallet  { appointment_id } -> pays the signed-in client's OWN unpaid
// booking from their wallet balance. Debit is written first, then the balance is re-checked
// (rolled back if it went negative), then the payment is flipped to paid with a status=neq.paid
// guard so a double click can never charge the wallet twice.
import { requireUser, resolveOwnCustomerId, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";
import { supaAdmin } from "../../_shared/adminAuth";
import { walletBalance, addClientNotification } from "../../_shared/clientExtras";
import { forwardAdminAlertsWhatsApp } from "../../_shared/liveChatWhatsapp";
import { emailBookingUpdate, whatsappBookingUpdate } from "../../_shared/bookingNotify";
import { resendPayload } from "../../_shared/emailDeliver";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<ClientEnv & any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request); if (user instanceof Response) return user;
  const cid = await resolveOwnCustomerId(env, user);
  if (!cid) return json({ error: "Your client account isn't linked yet." }, 400, origin);
  let body: any; try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const id = String(body?.appointment_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid booking." }, 400, origin);

  const aRes = await supaAdmin(env, `appointments?id=eq.${id}&customer_id=eq.${cid}&select=id,appointment_ref,status,total,service_name,package_name,payments(*)`, { method: "GET" });
  const appt = aRes.ok ? ((await aRes.json()) as any[])?.[0] : null;
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  const payment = (appt.payments || [])[0];
  if (!payment) return json({ error: "No payment record for this booking." }, 400, origin);
  if (payment.status === "paid") return json({ ok: true, already: true, ref: appt.appointment_ref }, 200, origin);
  if (["cancelled", "completed"].includes(appt.status)) return json({ error: "This booking can no longer be paid." }, 409, origin);
  const total = Math.round(Number(appt.total) * 100) / 100;
  if ((await walletBalance(env, cid)) < total) return json({ error: "Not enough wallet balance. Please top up or pay by card / PayPal." }, 402, origin);

  const ins = await supaAdmin(env, "wallet_transactions", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ customer_id: cid, amount: -total, currency: "AED", kind: "debit", note: `Booking ${appt.appointment_ref}`, appointment_id: appt.id, created_by: "client-wallet-pay" }) });
  const debit = ins.ok ? ((await ins.json()) as any[])?.[0] : null;
  if (!debit) return json({ error: "Could not use your wallet right now. Please try again." }, 500, origin);
  const rollback = () => supaAdmin(env, `wallet_transactions?id=eq.${debit.id}`, { method: "DELETE" });
  if ((await walletBalance(env, cid)) < 0) { await rollback(); return json({ error: "Not enough wallet balance." }, 402, origin); }

  const nowIso = new Date().toISOString();
  const upd = await supaAdmin(env, `payments?id=eq.${payment.id}&status=neq.paid`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "paid", provider: "wallet", provider_txn_id: `wallet:${debit.id}`, verified_by: "wallet", verified_at: nowIso, updated_at: nowIso }) });
  const rows = upd.ok ? ((await upd.json()) as any[]) : [];
  if (!rows.length) { await rollback(); return json({ ok: true, already: true, ref: appt.appointment_ref }, 200, origin); }

  await supaAdmin(env, `appointments?id=eq.${appt.id}`, { method: "PATCH", body: JSON.stringify({ status: "confirmed", updated_at: nowIso }) });
  await supaAdmin(env, "appointment_status_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: appt.id, old_status: appt.status, new_status: "confirmed", changed_by: "wallet", reason: `Paid from wallet (AED ${total})` }) }).catch(() => {});
  const balance = await walletBalance(env, cid);
  await addClientNotification(env, cid, `Booking ${appt.appointment_ref} paid from your wallet`, `AED ${total.toLocaleString()} used · balance AED ${balance.toLocaleString()}`, "/client", "wallet");
  const alert = `🔔 NEW PAID BOOKING — Naveed Anjum\n\n🎯 ${appt.service_name || "-"}${appt.package_name ? " (" + appt.package_name + ")" : ""}\n👛 Paid from client wallet: AED ${total}\nRef: ${appt.appointment_ref}\n\n🔗 https://bynaveedanjum.com/?admin=1`;
  try { await forwardAdminAlertsWhatsApp(env, alert); } catch {}
  try { if (env.RESEND_API_KEY) await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env, "booking@bynaveedanjum.com", `New paid booking — ${appt.appointment_ref}`, `<pre style="font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap">${alert.replace(/</g, "&lt;")}</pre>`)) }); } catch {}
  try { await whatsappBookingUpdate(env, appt.id, "confirmed", { paid: true }); } catch {}
  try { await emailBookingUpdate(env, appt.id, "confirmed"); } catch {}
  return json({ ok: true, ref: appt.appointment_ref, balance }, 200, origin);
};
