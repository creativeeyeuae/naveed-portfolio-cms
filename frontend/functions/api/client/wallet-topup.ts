// POST /api/client/wallet-topup
//   { action: "create", amount_aed }  -> { id }  (PayPal order for a wallet top-up)
//   { action: "capture", order_id }    -> { ok, balance }
// Signed-in clients only. The credited amount comes from PayPal's verified capture and the
// server-written custom_id ("topup:<customer>:<aed>"), never from the browser. A capture id is
// credited at most once (checked before and after insert).
import { requireUser, resolveOwnCustomerId, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";
import { supaAdmin } from "../../_shared/adminAuth";
import { paypalConfigured, paypalToken, paypalApi, usdFromAed } from "../../_shared/paypal";
import { walletBalance, addClientNotification } from "../../_shared/clientExtras";
import { forwardAdminAlertsWhatsApp } from "../../_shared/liveChatWhatsapp";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const MIN = 50, MAX = 20000;

export const onRequestPost: PagesFunction<ClientEnv & any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  if (!paypalConfigured(env)) return json({ error: "Online payment is not available." }, 503, origin);
  const user = await requireUser(request); if (user instanceof Response) return user;
  const cid = await resolveOwnCustomerId(env, user);
  if (!cid) return json({ error: "Your client account isn't linked yet. Please contact us." }, 400, origin);
  let body: any; try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const token = await paypalToken(env);

  if (body?.action === "create") {
    const aed = Math.round(Number(body.amount_aed));
    if (!Number.isFinite(aed) || aed < MIN || aed > MAX) return json({ error: `Top-up must be between AED ${MIN} and AED ${MAX.toLocaleString()}.` }, 400, origin);
    const created = await paypalApi(env, token, "/v2/checkout/orders", {
      method: "POST", requestId: `topup-${cid}-${Date.now()}`,
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: "WALLET-TOPUP", custom_id: `topup:${cid}:${aed}`, description: `Wallet top-up AED ${aed} — Naveed Anjum`, amount: { currency_code: "USD", value: usdFromAed(aed) } }],
        application_context: { brand_name: "Naveed Anjum", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
      }),
    });
    if (!created.ok || !created.body?.id) return json({ error: "Could not start PayPal payment. Please try again." }, 502, origin);
    return json({ id: created.body.id }, 200, origin);
  }

  if (body?.action === "capture") {
    const orderId = String(body.order_id || "");
    if (!/^[A-Z0-9]{8,40}$/i.test(orderId)) return json({ error: "Invalid payment reference." }, 400, origin);
    let cap = await paypalApi(env, token, `/v2/checkout/orders/${orderId}/capture`, { method: "POST", requestId: `capture-${orderId}`, body: "{}" });
    const issue = cap.body?.details?.[0]?.issue;
    if (!cap.ok && issue === "ORDER_ALREADY_CAPTURED") cap = await paypalApi(env, token, `/v2/checkout/orders/${orderId}`, { method: "GET" });
    if (!cap.ok) return json({ error: issue === "INSTRUMENT_DECLINED" ? "Your card / PayPal was declined. Please try another." : "PayPal could not complete the payment. You have not been charged.", retry: issue === "INSTRUMENT_DECLINED" }, 402, origin);
    const pu = cap.body?.purchase_units?.[0];
    const capture = pu?.payments?.captures?.[0];
    const m = /^topup:([0-9a-f-]{36}):(\d+)$/i.exec(String(pu?.custom_id || ""));
    if (capture?.status === "PENDING") return json({ pending: true, message: "PayPal is still processing — your wallet will be credited once it clears." }, 202, origin);
    if (cap.body?.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !m || m[1] !== cid || capture?.amount?.currency_code !== "USD" || capture?.amount?.value !== usdFromAed(Number(m[2]))) {
      await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: "paypal", action: "wallet_topup_mismatch", entity_type: "customer", entity_id: cid, details: { order_id: orderId, custom_id: pu?.custom_id, amount: capture?.amount } }) }).catch(() => {});
      return json({ error: "Payment could not be verified. Please contact us." }, 400, origin);
    }
    const aed = Number(m[2]);
    const tag = `PayPal ${capture.id}`;
    const exists = async () => { const r = await supaAdmin(env, `wallet_transactions?customer_id=eq.${cid}&note=like.*${encodeURIComponent(capture.id)}*&select=id,created_at&order=created_at.asc`, { method: "GET" }); return r.ok ? ((await r.json()) as any[]) : []; };
    if ((await exists()).length) return json({ ok: true, already: true, balance: await walletBalance(env, cid) }, 200, origin);
    await supaAdmin(env, "wallet_transactions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_id: cid, amount: aed, currency: "AED", kind: "credit", note: `Wallet top-up · ${tag}`, created_by: "client-topup" }) });
    const rows = await exists();
    for (const extra of rows.slice(1)) await supaAdmin(env, `wallet_transactions?id=eq.${extra.id}`, { method: "DELETE" });
    const balance = await walletBalance(env, cid);
    await addClientNotification(env, cid, `AED ${aed.toLocaleString()} added to your wallet`, `New balance: AED ${balance.toLocaleString()}`, "/client", "paypal");
    try { await forwardAdminAlertsWhatsApp(env, `💰 WALLET TOP-UP\n\n${user.email} added AED ${aed} (USD ${capture.amount.value}) via PayPal.\nNew balance: AED ${balance}`); } catch {}
    return json({ ok: true, balance }, 200, origin);
  }
  return json({ error: "Unknown action." }, 400, origin);
};
