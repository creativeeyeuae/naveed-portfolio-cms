// GET /api/admin/contacts/:id/card-image -- Part 2B: mints a short-lived signed URL for a
// contact's business-card image rather than ever exposing the private bucket (or a raw
// service-role-authenticated path) to the browser. The browser never sees the storage path
// itself -- only this freshly-minted, time-limited URL, requested on demand when the contact
// detail view actually needs to display the image.
//
// Any historical pre-migration row (isLegacyBase64 -- a full base64 data: URL already sitting
// in card_image_url) is passed through unchanged: it isn't a Storage object, so there's
// nothing to sign, and it keeps rendering exactly as it did before this migration.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { isLegacyBase64, getSignedBusinessCardUrl } from "../../../../_shared/businessCardStorage";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const res = await supaAdmin(env, `outreach_contacts?id=eq.${id}&select=card_image_url&limit=1`, { method: "GET" });
  const rows = res.ok ? ((await res.json()) as any[]) : [];
  const stored = rows?.[0]?.card_image_url as string | null | undefined;
  if (!stored) return json({ url: null }, 200, origin);

  if (isLegacyBase64(stored)) return json({ url: stored, legacy: true }, 200, origin);

  const signedUrl = await getSignedBusinessCardUrl(env, stored, 300);
  return json({ url: signedUrl }, 200, origin);
};
