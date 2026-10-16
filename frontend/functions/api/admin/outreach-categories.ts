// GET/POST /api/admin/outreach-categories -- the editable Company Categories list
// (migration 0025). Rename/delete live in outreach-categories/[id].ts.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { loadCategories } from "../../_shared/companyCategories";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const categories = await loadCategories(env);
  if (!categories) return json({ categories: [], ready: false }, 200, origin);
  return json({ categories, ready: true }, 200, origin);
};

// POST { name } -- adds a category at the end of the list (returns the existing one if the
// name is already taken, case-insensitively).
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || "").trim().slice(0, 60);
  if (!name) return json({ error: "Category name is required." }, 400, origin);

  const existing = await loadCategories(env);
  if (!existing) return json({ error: "Categories aren't set up yet -- run database migration 0025 in Supabase first." }, 409, origin);
  const dup = existing.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (dup) return json({ category: dup }, 200, origin);

  const sort_order = existing.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) + 1;
  const res = await supaAdmin(env, "outreach_categories", { method: "POST", body: JSON.stringify({ name, sort_order }) });
  if (!res.ok) return json({ error: "Could not create category.", detail: await res.text() }, 500, origin);
  return json({ category: ((await res.json()) as any[])?.[0] }, 200, origin);
};
