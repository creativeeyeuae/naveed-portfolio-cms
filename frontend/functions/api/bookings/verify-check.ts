// POST /api/bookings/verify-check  { token, email_code, whatsapp_code }
// Both codes must match. Returns a "verified" token that /api/bookings/create requires.
import { json, corsHeaders } from "../../_shared/adminAuth";
import { sign, unsign, sha } from "../../_shared/bookingVerify";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const t = await unsign(env, b.token);
  if (!t || t.t !== "start") return json({ error: "Your code has expired. Please request a new one.", expired: true }, 400, origin);
  const ec = String(b.email_code || "").replace(/\D/g, ""), wc = String(b.whatsapp_code || "").replace(/\D/g, "");
  const okE = ec.length === 6 && (await sha(t.s + ec)) === t.he;
  const okW = wc.length === 6 && (await sha(t.s + wc)) === t.hw;
  if (!okE || !okW) return json({ error: !okE && !okW ? "Both codes are incorrect." : !okE ? "The email code is incorrect." : "The WhatsApp code is incorrect." }, 400, origin);
  const verified = await sign(env, { t: "verified", e: t.e, p: t.p, exp: Date.now() + 3 * 3600e3 });
  return json({ verified }, 200, origin);
};
