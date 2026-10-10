// Email + WhatsApp verification for website bookings -- stateless (no new table):
// codes are never stored; the browser holds an HMAC-signed token containing only hashes of the
// codes, the email/phone they were sent to, and an expiry. Key = derived from the service key.
const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function key(env: any) {
  return crypto.subtle.importKey("raw", enc.encode("booking-verify-v1:" + env.SUPABASE_SERVICE_ROLE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function sha(s: string) { return b64u(await crypto.subtle.digest("SHA-256", enc.encode(s))); }

export async function sign(env: any, payload: any): Promise<string> {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = b64u(await crypto.subtle.sign("HMAC", await key(env), enc.encode(body)));
  return `${body}.${sig}`;
}
export async function unsign(env: any, token: string): Promise<any | null> {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(env), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    return p.exp && p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const normEmail = (e: any) => String(e || "").trim().toLowerCase();
import { toWhatsAppNumber } from "./liveChatWhatsapp";
export const normPhone = (p: any) => toWhatsAppNumber(String(p || ""));
export const sixDigits = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
