// POST /api/payments/paypal/create-order   body: { appointment_id }
// Creates a PayPal order for an EXISTING booking. Amount/currency come only from the database.
// Re-uses an already-created order for the same booking (no duplicate orders on retries).
import { json, corsHeaders, supaAdmin } from "../../../_shared/adminAuth";
import { paypalConfigured, paypalToken, paypalApi, usdFromAed, loadPayableBooking } from "../../../_shared/paypal";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  if (!paypalConfigured(env)) return json({ error: "Online payment is not available." }, 503, origin);
  let body: any; try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }

  const loaded = await loadPayableBooking(env, String(body?.appointment_id || ""));
  if ("error" in loaded) return json({ error: loaded.error }, loaded.code, origin);
  const { appt, payment } = loaded;
  if (payment.status === "paid") return json({ error: "This booking is already paid." }, 409, origin);
  if (["cancelled", "completed"].includes(appt.status)) return json({ error: "This booking can no longer be paid." }, 409, origin);

  const usd = usdFromAed(appt.total);
  const token = await paypalToken(env);

  // Same booking + still-open order -> return it instead of creating a second one.
  const prev = String(payment.provider_txn_id || "");
  if (prev.startsWith("order:")) {
    const existing = await paypalApi(env, token, `/v2/checkout/orders/${prev.slice(6)}`, { method: "GET" });
    const amt = existing.body?.purchase_units?.[0]?.amount;
    if (existing.ok && ["CREATED", "APPROVED", "PAYER_ACTION_REQUIRED"].includes(existing.body.status) && amt?.value === usd && amt?.currency_code === "USD") {
      return json({ id: existing.body.id }, 200, origin);
    }
  }

  const created = await paypalApi(env, token, "/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${appt.id}-${Date.now()}`,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: appt.appointment_ref,
        custom_id: appt.id,
        description: `${appt.service_name || "Booking"}${appt.package_name ? " - " + appt.package_name : ""} (${appt.appointment_ref}) AED ${appt.total}`.slice(0, 127),
        amount: { currency_code: "USD", value: usd },
      }],
      application_context: { brand_name: "Naveed Anjum", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
    }),
  });
  if (!created.ok || !created.body?.id) return json({ error: "Could not start PayPal payment. Please try again." }, 502, origin);

  await supaAdmin(env, `payments?id=eq.${payment.id}`, {
    method: "PATCH",
    body: JSON.stringify({ provider: "paypal", provider_txn_id: `order:${created.body.id}`, updated_at: new Date().toISOString() }),
  });
  return json({ id: created.body.id }, 200, origin);
};
