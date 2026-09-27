// GET /api/admin/google-reviews-archive?placeId=<Google Place ID>
//
// Admin-only read of the FULL Google Reviews archive that functions/api/google-reviews.ts
// keeps in site_settings (key `nap_google_reviews_archive:<placeId>`) -- including any review
// already marked hidden (the public endpoint filters those out; this one shows everything so
// the CMS's Reviews tab can let admin curate). Same archive, same table -- no new schema.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

function archiveKey(placeId: string) {
  return `nap_google_reviews_archive:${placeId}`;
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const placeId = (url.searchParams.get("placeId") || "").trim();
  if (!placeId) return json({ reviews: [] }, 200, origin);

  const res = await supaAdmin(env, `site_settings?key=eq.${encodeURIComponent(archiveKey(placeId))}&select=value`, {
    method: "GET",
  });
  if (!res.ok) return json({ error: "Could not load Google reviews archive.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  const raw = rows?.[0]?.value;
  let reviews: any[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    reviews = Array.isArray(parsed) ? parsed : [];
  } catch {}

  return json({ reviews }, 200, origin);
};
