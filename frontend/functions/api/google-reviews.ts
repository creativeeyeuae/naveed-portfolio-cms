// GET /api/google-reviews?placeId=<Google Place ID>
//
// Public, read-only endpoint. Returns { rating, total, reviews } for the homepage's
// Google Reviews marquee.
//
// Google's Places API (New) only ever returns up to 5 reviews per place, no matter how
// many real reviews the business actually has. To get past that cap, this function keeps a
// small permanent archive in Supabase: every time it fetches from Google, any review it
// hasn't seen before gets appended to the archive (deduped by Google's own review id, or by
// author+text if that isn't present). The response then returns the accumulated archive
// instead of just today's live top-5. Every review shown is a real one -- nothing here is
// invented. (The archive was also one-time seeded on 2026-09-12 with the site's other real
// reviews, copied verbatim from the business's own public Google Business Profile page, so
// the site didn't have to wait for them to organically rotate into Google's live top-5.)
//
// The archive write uses the Cloudflare Pages secret SUPABASE_SERVICE_ROLE_KEY (never sent
// to the browser -- same secret already used by functions/_shared/adminAuth.ts). If that
// secret is ever missing, archiving is silently skipped and the endpoint just returns
// whatever Google returns live, exactly like before this feature existed.

export type GoogleReviewsEnv = {
  GOOGLE_PLACES_API_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
const ARCHIVE_KEY_PREFIX = "nap_google_reviews_archive";
const ARCHIVE_MAX = 60;

type MappedReview = {
  author: string;
  photo: string;
  rating: number;
  text: string;
  relativeTime: string;
};
type ArchivedReview = MappedReview & { key: string; firstSeen: string };

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function archiveSettingsKey(placeId: string) {
  // One archive row per place id, so this never mixes review sets if the place ever changes.
  return `${ARCHIVE_KEY_PREFIX}:${placeId}`;
}

function supaHeaders(env: GoogleReviewsEnv) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function readArchive(env: GoogleReviewsEnv, placeId: string): Promise<ArchivedReview[]> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?key=eq.${encodeURIComponent(archiveSettingsKey(placeId))}&select=value`,
      { headers: supaHeaders(env) }
    );
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    const raw = rows[0]?.value;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeArchive(env: GoogleReviewsEnv, placeId: string, archive: ArchivedReview[]) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return;
  const key = archiveSettingsKey(placeId);
  const value = JSON.stringify(archive);
  try {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?key=eq.${encodeURIComponent(key)}`,
      { method: "PATCH", headers: supaHeaders(env), body: JSON.stringify({ value }) }
    );
    if (patchRes.ok) {
      const rows: any[] = await patchRes.json().catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) return; // updated an existing row
    }
    // No existing row to update -- insert one.
    await fetch(`${SUPABASE_URL}/rest/v1/site_settings`, {
      method: "POST",
      headers: supaHeaders(env),
      body: JSON.stringify({ key, value }),
    });
  } catch {
    // Best-effort only -- a failed archive write must never break the live reviews response.
  }
}

function stripInternal(a: ArchivedReview): MappedReview {
  const { key, firstSeen, ...rest } = a;
  return rest;
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<GoogleReviewsEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  const placeId = (url.searchParams.get("placeId") || "").trim();
  const apiKey = env.GOOGLE_PLACES_API_KEY;

  if (!placeId || !apiKey) {
    return json({ rating: null, total: 0, reviews: [] }, 200, origin);
  }

  try {
    const gRes = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
    });
    if (!gRes.ok) {
      const archive = await readArchive(env, placeId);
      const reviews = archive.map(stripInternal);
      return json({ rating: null, total: 0, reviews }, 200, origin);
    }
    const data: any = await gRes.json();
    const rawReviews: any[] = Array.isArray(data.reviews) ? data.reviews.slice(0, 8) : [];
    const liveReviews: MappedReview[] = rawReviews.map((r: any) => ({
      author: r.authorAttribution?.displayName || "Google User",
      photo: r.authorAttribution?.photoUri || "",
      rating: typeof r.rating === "number" ? r.rating : 5,
      text: r.text?.text || r.originalText?.text || "",
      relativeTime: r.relativePublishTimeDescription || "",
    }));

    let archive = await readArchive(env, placeId);
    const existingKeys = new Set(archive.map((a) => a.key));
    let changed = false;
    rawReviews.forEach((r, i) => {
      const mapped = liveReviews[i];
      const key: string = r?.name || `${mapped.author}::${mapped.text.slice(0, 80)}`;
      if (!existingKeys.has(key)) {
        archive.push({ ...mapped, key, firstSeen: new Date().toISOString() });
        existingKeys.add(key);
        changed = true;
      }
    });
    if (changed) {
      if (archive.length > ARCHIVE_MAX) archive = archive.slice(archive.length - ARCHIVE_MAX);
      await writeArchive(env, placeId, archive);
    }

    const reviews = archive.length > 0 ? archive.map(stripInternal) : liveReviews;
    const body = { rating: typeof data.rating === "number" ? data.rating : null, total: data.userRatingCount || 0, reviews };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120", ...corsHeaders(origin) },
    });
  } catch {
    const archive = await readArchive(env, placeId);
    const reviews = archive.map(stripInternal);
    return json({ rating: null, total: 0, reviews }, 200, origin);
  }
};
