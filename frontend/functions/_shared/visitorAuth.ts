// Secure, server-signed visitor identity -- NOT the existing Supabase Auth (that stays
// admin-only, untouched). Visitors sign up with just name/email/whatsapp (no password),
// then are recognized across requests via a signed, HttpOnly, SameSite=Lax session
// cookie. The browser only ever holds an opaque signed token; it can't read or edit the
// visitor id inside it (HttpOnly blocks JS access) and can't forge a different one
// (the HMAC signature is verified server-side on every request against a secret that
// only this Cloudflare Pages project holds -- VISITOR_SESSION_SECRET, a Pages secret,
// never sent to the browser). This is what points 3/21 of the spec require instead of a
// plain editable cookie.
export type VisitorEnv = { VISITOR_SESSION_SECRET: string };

const COOKIE_NAME = "na_visitor_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Signs a token carrying only the visitor's id + issue time -- never their name/email/
// whatsapp -- so even the (unreadable-by-JS, but still ultimately client-stored) cookie
// value leaks nothing if it were ever intercepted.
export async function signVisitorToken(env: VisitorEnv, visitorId: string): Promise<string> {
  const payload = JSON.stringify({ vid: visitorId, iat: Date.now() });
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payload));
  const key = await hmacKey(env.VISITOR_SESSION_SECRET);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = b64urlEncode(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

// Verifies the signature server-side (constant-time via crypto.subtle.verify) and
// returns the visitor id, or null if missing/tampered/malformed. A client editing the
// cookie's payload without knowing the secret always fails verification here.
export async function verifyVisitorToken(env: VisitorEnv, token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await hmacKey(env.VISITOR_SESSION_SECRET);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    return typeof payload?.vid === "string" ? payload.vid : null;
  } catch {
    return null;
  }
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// Reads + verifies the session cookie on an incoming request. Returns the visitor id,
// or null if the visitor has never identified themselves / the token is invalid.
export async function getVisitorIdFromRequest(request: Request, env: VisitorEnv): Promise<string | null> {
  const raw = parseCookie(request.headers.get("Cookie"), COOKIE_NAME);
  if (!raw) return null;
  return verifyVisitorToken(env, raw);
}

// Builds the Set-Cookie header value for a freshly-identified visitor. HttpOnly blocks
// any client-side script from reading or editing it; Secure restricts it to HTTPS
// (the site is always served over HTTPS); SameSite=Lax is the standard safe default for
// a same-site session cookie used by same-site fetches like this one.
export function buildVisitorSetCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}
