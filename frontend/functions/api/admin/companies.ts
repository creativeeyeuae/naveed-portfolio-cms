// GET/POST /api/admin/companies -- the outreach Companies database (Step 1 of the shared
// Company + Contact foundation). Isolated from the Creative Fusion CRM's customers table.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { loadCategories, loadAllCategoryLinks, linkCategories, autoCategorize, fetchAllRows } from "../../_shared/companyCategories";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  // Paged: Supabase returns at most 1000 rows per request and the list is past 900.
  const companies = await fetchAllRows<any>(env, "outreach_companies?select=*&order=created_at.desc,id.asc");
  if (!companies) return json({ error: "Could not load companies." }, 500, origin);

  const tagLinks = (await fetchAllRows<any>(env, "outreach_company_tags?select=company_id,tag_id,outreach_tags(id,name)&order=company_id.asc,tag_id.asc")) || [];
  const tagsByCompany = new Map<string, any[]>();
  for (const t of tagLinks) {
    if (!t.company_id || !t.outreach_tags) continue;
    if (!tagsByCompany.has(t.company_id)) tagsByCompany.set(t.company_id, []);
    tagsByCompany.get(t.company_id)!.push(t.outreach_tags);
  }

  const contactRows = (await fetchAllRows<any>(env, "outreach_contacts?select=id,company_id&company_id=not.is.null&order=id.asc")) || [];
  const countByCompany = new Map<string, number>();
  for (const c of contactRows) {
    if (!c.company_id) continue;
    countByCompany.set(c.company_id, (countByCompany.get(c.company_id) || 0) + 1);
  }

  // Categories (migration 0025). null => tables not created yet; the page still works.
  const [categories, catLinks] = await Promise.all([loadCategories(env), loadAllCategoryLinks(env)]);
  const catIdsByCompany = new Map<string, string[]>();
  for (const l of catLinks || []) {
    if (!catIdsByCompany.has(l.company_id)) catIdsByCompany.set(l.company_id, []);
    catIdsByCompany.get(l.company_id)!.push(l.category_id);
  }

  const out = companies.map((c) => ({ ...c, tags: tagsByCompany.get(c.id) || [], contact_count: countByCompany.get(c.id) || 0, category_ids: catIdsByCompany.get(c.id) || [] }));
  return json({ companies: out, categories: categories || [], categories_ready: !!categories }, 200, origin);
};

// POST -- creates a company. Checks name/website for a possible existing match first (unless
// force:true) and returns 409 with the match instead of silently creating a duplicate, per
// "do not create duplicate company records simply because a company has multiple contacts".
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Company name is required." }, 400, origin);
  const website = body.website ? String(body.website).trim() : null;

  if (!body.force) {
    const filters: string[] = [`name.ilike.${encodeURIComponent(name)}`];
    if (website) filters.push(`website.ilike.${encodeURIComponent(website)}`);
    const dupRes = await supaAdmin(env, `outreach_companies?or=(${filters.join(",")})&select=*&limit=1`, { method: "GET" });
    const dupRows = dupRes.ok ? ((await dupRes.json()) as any[]) : [];
    if (dupRows?.[0]) return json({ duplicate: dupRows[0] }, 409, origin);
  }

  const row: Record<string, unknown> = {
    name,
    industry: body.industry || null,
    website,
    email: body.email || null,
    phone: body.phone || null,
    whatsapp: body.whatsapp || null,
    country: body.country || null,
    city: body.city || null,
    address: body.address || null,
    linkedin: body.linkedin || null,
    notes: body.notes || null,
    status: body.status || "prospect",
    source: body.source || "manual",
  };
  const res = await supaAdmin(env, "outreach_companies", { method: "POST", body: JSON.stringify(row) });
  if (!res.ok) return json({ error: "Could not create company.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  const created = rows?.[0];

  // Categories picked in the Add form; if none were picked, auto-file by industry text.
  const pickedCats = Array.isArray(body.category_ids) ? (body.category_ids as unknown[]).map(String).filter(Boolean) : [];
  if (created?.id) {
    if (pickedCats.length) await linkCategories(env, created.id, pickedCats).catch(() => false);
    else await autoCategorize(env, created.id, row.industry);
  }

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "outreach_company_created", entity_type: "outreach_company", entity_id: created?.id, details: { source: body.source || "manual" } }),
  });

  return json({ company: created }, 200, origin);
};
