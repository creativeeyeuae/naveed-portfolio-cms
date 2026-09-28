// GET /api/admin/crm-tags -- every tag that exists, for the tag picker/autocomplete.
// (Named crm-tags, not tags.ts, to stay clearly distinct from any future non-CRM use of
// "tags" elsewhere in the CMS.)
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "crm_tags?select=*&order=name.asc&limit=500", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load tags.", detail: await res.text() }, 500, origin);
  return json({ tags: await res.json() }, 200, origin);
};
