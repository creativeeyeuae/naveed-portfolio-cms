// POST /api/bookings/verify-start  { name, email, phone }
// Sends one 6-digit code by EMAIL and another by WHATSAPP. Returns a signed token (hashes only).
import { json, corsHeaders } from "../../_shared/adminAuth";
import { resendPayload } from "../../_shared/emailDeliver";
import { forwardClientWhatsAppAlert } from "../../_shared/liveChatWhatsapp";
import { sign, sha, normEmail, normPhone, sixDigits } from "../../_shared/bookingVerify";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const email = normEmail(b.email), phone = normPhone(b.phone);
  const name = String(b.name || "").trim().slice(0, 80) || "there";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Please enter a valid email address." }, 400, origin);
  if (phone.length < 8 || phone.length > 15) return json({ error: "Please enter a valid WhatsApp number." }, 400, origin);
  if (!env.RESEND_API_KEY) return json({ error: "Verification is temporarily unavailable. Please contact us on WhatsApp." }, 503, origin);

  const ec = sixDigits(), wc = sixDigits(), salt = crypto.randomUUID();

  // WhatsApp code
  let waTo = "";
  try { waTo = await forwardClientWhatsAppAlert(env, phone, `🔐 Your booking verification code is *${wc}*\n\nEnter it on bynaveedanjum.com to continue. It expires in 15 minutes.\nIf you didn't request this, ignore this message.\n— Naveed Anjum`, name); } catch {}
  if (!waTo) return json({ error: "We couldn't send a WhatsApp message to this number. Please check the country code and number." }, 400, origin);

  // Email code
  const html = `<div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px;color:#222"><h2 style="margin:0 0 8px">Verify your email</h2><p>Hi ${name.replace(/[<>&]/g, "")},</p><p>Your booking verification code is:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f3f0fa;border-radius:10px;padding:16px;text-align:center;color:#5b21b6">${ec}</div><p style="color:#666;font-size:13px">It expires in 15 minutes. If you didn't request this, you can ignore this email.</p><p>— Naveed Anjum</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(resendPayload(env, email, `Your verification code: ${ec}`, html)),
  });
  if (!r.ok) return json({ error: "We couldn't send an email to this address. Please check it and try again." }, 400, origin);

  const token = await sign(env, { t: "start", e: email, p: phone, s: salt, he: await sha(salt + ec), hw: await sha(salt + wc), exp: Date.now() + 15 * 60e3 });
  return json({ token, whatsapp: waTo }, 200, origin);
};
