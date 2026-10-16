// PATCH/DELETE /api/admin/outreach-categories/:id -- rename or reorder a company category,
// or delete it. Deleting removes only the category and its links; companies are untouched.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fields: Record<string, unknown> = {};
  if ("name" in body) {
    const name = String(body.name || "").trim().slice(0, 60);
    if (!name) return json({ error: "Category name can't be empty." }, 400, origin);
    const clash = await supaAdmin(env, `outreach_categories?select=id&name=ilike.${encodeURIComponent(name)}&id=neq.${id}&limit=1`, { method: "GET" });
    if (clash.ok && ((await clash.json()) as any[]).length) return json({ error: `A category called "${name}" already exists.` }, 409, origin);
    fields.name = name;
  }
  if ("sort_order" in body) fields.sort_order = Number(body.sort_order) || 0;
  if (!Object.keys(fields).length) return json({ error: "Nothing to update." }, 400, origin);

  const res = await supaAdmin(env, `outreach_categories?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(fields) });
  if (!res.ok) return json({ error: "Could not update category.", detail: await res.text() }, 500, origin);
  return json({ category: ((await res.json()) as any[])?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const res = await supaAdmin(env, `outreach_categories?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete category.", detail: await res.text() }, 500, origin);
  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "outreach_category_deleted", entity_type: "outreach_category", entity_id: id, details: {} }),
  });
  return json({ ok: true }, 200, origin);
};
