// POST /api/admin/company-categories-bulk { company_ids, add_ids?, remove_ids? } -- add and/or
// remove categories on many ticked companies at once (Companies page bulk bar). Existing
// categories on those companies are kept unless explicitly removed.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const list = (v: unknown) => (Array.isArray(v) ? Array.from(new Set(v.map(String).filter(Boolean))) : []);

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const companyIds = list(body.company_ids).slice(0, 5000);
  const addIds = list(body.add_ids);
  const removeIds = list(body.remove_ids);
  if (!companyIds.length) return json({ error: "Tick at least one company." }, 400, origin);
  if (!addIds.length && !removeIds.length) return json({ error: "Choose a category to add or remove." }, 400, origin);

  // Chunk so URLs / payloads stay small.
  for (let i = 0; i < companyIds.length; i += 150) {
    const chunk = companyIds.slice(i, i + 150);
    if (removeIds.length) {
      const r = await supaAdmin(env, `outreach_company_categories?company_id=in.(${chunk.join(",")})&category_id=in.(${removeIds.join(",")})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (!r.ok) return json({ error: "Could not remove categories.", detail: await r.text() }, 500, origin);
    }
    if (addIds.length) {
      const rows = chunk.flatMap((company_id) => addIds.map((category_id) => ({ company_id, category_id })));
      const r = await supaAdmin(env, "outreach_company_categories", { method: "POST", headers: { Prefer: "return=minimal,resolution=ignore-duplicates" }, body: JSON.stringify(rows) });
      if (!r.ok) return json({ error: "Could not add categories.", detail: await r.text() }, 500, origin);
    }
  }
  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "outreach_categories_bulk", entity_type: "outreach_company", entity_id: null, details: { companies: companyIds.length, add: addIds, remove: removeIds } }),
  });
  return json({ ok: true, updated: companyIds.length }, 200, origin);
};
