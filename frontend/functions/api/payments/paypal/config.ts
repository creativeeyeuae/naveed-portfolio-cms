// GET /api/payments/paypal/config -> public info the PayPal JS SDK needs (client id is
// public by design). The secret is never returned. enabled=false hides the PayPal option.
import { json, corsHeaders } from "../../../_shared/adminAuth";
import { paypalConfigured, AED_PER_USD } from "../../../_shared/paypal";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  if (!paypalConfigured(env)) return json({ enabled: false }, 200, origin);
  return json({
    enabled: true,
    clientId: env.PAYPAL_CLIENT_ID,
    env: String(env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox",
    currency: "USD",
    aedPerUsd: AED_PER_USD,
  }, 200, origin);
};
