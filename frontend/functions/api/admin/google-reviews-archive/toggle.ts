// POST /api/admin/google-reviews-archive/toggle   body: { placeId, key, hidden }
//
// Marks one archived Google review hidden/shown on the public site. Writes back to the same
// site_settings archive row functions/api/google-reviews.ts already owns -- this never
// touches Google's own data, only whether that one review is included in what the public
// endpoint returns (see the `hidden` filter added there).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

function archiveKey(placeId: string) {
  return `nap_google_reviews_archive:${placeId}`;
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  let placeId = "", key = "";
  let hidden = true;
  try {
    const body = (await request.json()) as { placeId?: string; key?: string; hidden?: boolean };
    placeId = (body.placeId || "").trim();
    key = (body.key || "").trim();
    hidden = body.hidden !== false;
  } catch {}
  if (!placeId || !key) return json({ error: "placeId and key are required." }, 400, origin);

  const settingsKey = archiveKey(placeId);
  const getRes = await supaAdmin(env, `site_settings?key=eq.${encodeURIComponent(settingsKey)}&select=value`, {
    method: "GET",
  });
  if (!getRes.ok) return json({ error: "Could not load archive.", detail: await getRes.text() }, 500, origin);
  const rows = (await getRes.json()) as any[];
  const raw = rows?.[0]?.value;
  let archive: any[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    archive = Array.isArray(parsed) ? parsed : [];
  } catch {}

  const idx = archive.findIndex((r) => r.key === key);
  if (idx === -1) return json({ error: "Review not found in archive." }, 404, origin);
  archive[idx] = { ...archive[idx], hidden };

  const patchRes = await supaAdmin(env, `site_settings?key=eq.${encodeURIComponent(settingsKey)}`, {
    method: "PATCH",
    body: JSON.stringify({ value: JSON.stringify(archive) }),
  });
  if (!patchRes.ok) return json({ error: "Could not save.", detail: await patchRes.text() }, 500, origin);

  return json({ ok: true }, 200, origin);
};
