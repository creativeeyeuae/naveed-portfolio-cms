// Part 2B: Supabase Storage-backed persistence for business-card images, replacing the
// earlier base64-in-column approach. Server-side only -- the browser never sees the
// service-role key and never chooses a storage path; every path is generated here from a
// random UUID, never from anything the browser supplied, so a path can't be guessed or
// manipulated to reach another record's image.
import type { AdminEnv } from "./adminAuth";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
export const BUSINESS_CARD_BUCKET = "business-card-images";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// A value already in card_image / card_image_url before this phase is a full base64 data:
// URL (potentially megabytes long); going forward it's a short storage object path. This
// lets old rows (if any exist) keep reading correctly without a migration or a schema change.
export function isLegacyBase64(value: string | null | undefined): boolean {
  return !!value && value.startsWith("data:");
}

// Best-effort, per-isolate memo so a warm Worker isolate doesn't re-check the bucket on every
// single request -- a fresh/cold isolate just checks (and creates if needed) once more, which
// is cheap and idempotent either way.
let bucketEnsured = false;

async function ensureBucketExists(env: AdminEnv): Promise<void> {
  if (bucketEnsured) return;
  const authHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  try {
    const check = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUSINESS_CARD_BUCKET}`, { headers: authHeaders });
    if (check.ok) { bucketEnsured = true; return; }
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: BUSINESS_CARD_BUCKET,
        name: BUSINESS_CARD_BUCKET,
        public: false,
        file_size_limit: 8 * 1024 * 1024,
        allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
      }),
    });
  } catch {
    // Best-effort -- if this fails, the upload call right after will surface its own real
    // error rather than silently pretending to succeed.
  }
  bucketEnsured = true;
}

// Uploads already-validated image bytes under a fresh, unpredictable, server-chosen path
// (never a filename or anything else the browser supplied). Returns the storage object path
// to store in the database (NOT a URL), or null on failure -- storage is best-effort exactly
// like every other optional step in this feature; a failed upload must never block scanning
// or saving a contact. Organized by year-month purely for human browsability in the Supabase
// dashboard; the random UUID is what actually makes the path unguessable.
export async function uploadBusinessCardImage(env: AdminEnv, bytes: Uint8Array, mime: string): Promise<string | null> {
  try {
    await ensureBucketExists(env);
    const ext = EXT_BY_MIME[mime] || "jpg";
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUSINESS_CARD_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": mime,
      },
      body: bytes,
    });
    return res.ok ? path : null;
  } catch {
    return null;
  }
}

// Short-lived signed URL for private display -- never a permanent/public link. 5 minutes is
// long enough to load one <img>, short enough that a leaked link is useless soon after.
export async function getSignedBusinessCardUrl(env: AdminEnv, path: string, expiresInSeconds = 300): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUSINESS_CARD_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signedPath = data.signedURL || data.signedUrl;
    if (!signedPath) return null;
    return signedPath.startsWith("http") ? signedPath : `${SUPABASE_URL}/storage/v1${signedPath}`;
  } catch {
    return null;
  }
}

// Best-effort delete, called when a scan or contact is permanently deleted. Never throws --
// a failed delete just leaves one orphaned object (a storage cost, not a correctness issue),
// exactly the same trade-off this project already accepts for other best-effort steps.
export async function deleteBusinessCardImage(env: AdminEnv, path: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUSINESS_CARD_BUCKET}/${path}`, {
      method: "DELETE",
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
  } catch {
    // Best-effort cleanup only.
  }
}
