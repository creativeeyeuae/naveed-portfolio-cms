// Minimal, dependency-free Web Push (RFC 8291 message encryption + RFC 8292 VAPID) sender,
// built entirely on the Workers-native Web Crypto API. No npm package -- nothing to bundle,
// and no Node-crypto compatibility risk on Cloudflare Pages Functions.
//
// Used to alert the admin on mobile and desktop even when the CMS tab/app isn't open.

export type PushEnv = {
  SUPABASE_SERVICE_ROLE_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string; // e.g. "mailto:you@example.com"
};

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";

// Cast at the WebCrypto/fetch boundary only -- TS's newer generic ArrayBufferLike typing for
// Uint8Array is stricter than the Workers runtime actually requires; this file isn't part of
// the Next.js type-check anyway (see functions/types.d.ts), so this keeps the code simple.
type Bytes = Uint8Array & BufferSource;

function b64urlToBytes(b64url: string): Bytes {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes as Bytes;
}
function bytesToB64url(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concatBytes(...parts: Uint8Array[]): Bytes {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out as Bytes;
}
// Same boundary cast, for values that came back from crypto.subtle as an ArrayBuffer and are
// about to be fed into another crypto.subtle call that wants BufferSource.
function toBytes(buf: ArrayBuffer): Bytes {
  return new Uint8Array(buf) as Bytes;
}

async function importVapidPrivateKey(env: PushEnv): Promise<CryptoKey> {
  const priv = b64urlToBytes(env.VAPID_PRIVATE_KEY);
  const pub = b64urlToBytes(env.VAPID_PUBLIC_KEY); // 65 bytes: 0x04 || X(32) || Y(32)
  const x = pub.slice(1, 33), y = pub.slice(33, 65);
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", d: bytesToB64url(priv), x: bytesToB64url(x), y: bytesToB64url(y), ext: true };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function vapidJwt(endpoint: string, env: PushEnv): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT };
  const enc = (o: unknown) => bytesToB64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const key = await importVapidPrivateKey(env);
  // WebCrypto's ECDSA signature is raw r||s (IEEE P1363) -- exactly the format JWS ES256 wants.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${bytesToB64url(sig)}`;
}

// RFC 8291 aes128gcm encryption of `payload` for one subscriber. Always sent as a single,
// final record (delimiter byte 0x02, no extra padding) -- our payloads are tiny JSON blobs.
async function encryptPayload(payload: Uint8Array, p256dhB64: string, authB64: string): Promise<Bytes> {
  const uaPublic = b64urlToBytes(p256dhB64); // subscriber's public key, 65 bytes
  const authSecret = b64urlToBytes(authB64); // subscriber's auth secret, 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Bytes;

  const peerKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublicRaw = toBytes(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const ecdhSecret = toBytes(
    await crypto.subtle.deriveBits({ name: "ECDH", public: peerKey } as EcdhKeyDeriveParams, ephemeral.privateKey, 256)
  );

  // Stage 1: combine the ECDH secret with the subscriber's auth secret (RFC 8291 "combine" step).
  const keyInfo = concatBytes(new TextEncoder().encode("WebPush: info\0"), uaPublic, asPublicRaw);
  const ikmKeyMaterial = await crypto.subtle.importKey("raw", ecdhSecret, "HKDF", false, ["deriveBits"]);
  const ikm = toBytes(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo }, ikmKeyMaterial, 256)
  );

  // Stage 2: derive the content-encryption key and nonce from the per-message random salt.
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const cek = toBytes(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, ikmKey, 128));
  const nonce = toBytes(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, ikmKey, 96));

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concatBytes(payload, new Uint8Array([2])); // delimiter marking the (only) final record
  const ciphertext = toBytes(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, padded));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096); // record size, big-endian
  const header = concatBytes(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);
  return concatBytes(header, ciphertext);
}

export type PushSubscriptionRow = { id?: string; endpoint: string; p256dh: string; auth: string };

// Sends one push message; returns the HTTP status so the caller can prune dead subscriptions
// (404/410 means the browser unsubscribed or the endpoint expired).
export async function sendPush(sub: PushSubscriptionRow, payload: object, env: PushEnv): Promise<number> {
  const body = await encryptPayload(new TextEncoder().encode(JSON.stringify(payload)), sub.p256dh, sub.auth);
  const jwt = await vapidJwt(sub.endpoint, env);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    },
    body,
  });
  return res.status;
}

// Loads every stored subscription, sends to all of them, and prunes any that are dead. Never
// throws -- one bad subscriber (or a transient error) never blocks the caller's own request.
export async function notifyAllAdmins(env: PushEnv, payload: object): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!res.ok) return;
    const subs = (await res.json()) as (PushSubscriptionRow & { id: string })[];
    await Promise.all(
      subs.map(async (sub) => {
        try {
          const status = await sendPush(sub, payload, env);
          if (status === 404 || status === 410) {
            await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`, {
              method: "DELETE",
              headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
            });
          }
        } catch {
          // One subscriber failing (offline device, bad key, etc.) must never block the others.
        }
      })
    );
  } catch {
    // Never let a push failure break the caller's own request (booking, approval, etc).
  }
}
