// PUT /api/admin/companies/:id/categories { category_ids: string[] } -- replaces the full set
// of categories on one company (a company can be in several at once).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { linkCategories } from "../../../../_shared/companyCategories";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPut: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const companyId = params.id as string;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.category_ids) ? (body.category_ids as unknown[]).map(String).filter(Boolean) : [];

  const del = await supaAdmin(env, `outreach_company_categories?company_id=eq.${companyId}${ids.length ? `&category_id=not.in.(${ids.join(",")})` : ""}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!del.ok) return json({ error: "Could not update categories -- has migration 0025 been run?", detail: await del.text() }, 500, origin);
  if (!(await linkCategories(env, companyId, ids))) return json({ error: "Could not save categories." }, 500, origin);
  return json({ ok: true, category_ids: ids }, 200, origin);
};
