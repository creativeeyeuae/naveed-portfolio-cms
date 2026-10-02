// GET/POST /api/admin/companies -- the outreach Companies database (Step 1 of the shared
// Company + Contact foundation). Isolated from the Creative Fusion CRM's customers table.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "outreach_companies?select=*&order=created_at.desc&limit=1000", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load companies.", detail: await res.text() }, 500, origin);
  const companies = (await res.json()) as any[];

  const tagRes = await supaAdmin(env, "outreach_company_tags?select=company_id,outreach_tags(id,name)", { method: "GET" });
  const tagLinks = tagRes.ok ? ((await tagRes.json()) as any[]) : [];
  const tagsByCompany = new Map<string, any[]>();
  for (const t of tagLinks) {
    if (!t.company_id || !t.outreach_tags) continue;
    if (!tagsByCompany.has(t.company_id)) tagsByCompany.set(t.company_id, []);
    tagsByCompany.get(t.company_id)!.push(t.outreach_tags);
  }

  const contactCountRes = await supaAdmin(env, "outreach_contacts?select=id,company_id", { method: "GET" });
  const contactRows = contactCountRes.ok ? ((await contactCountRes.json()) as any[]) : [];
  const countByCompany = new Map<string, number>();
  for (const c of contactRows) {
    if (!c.company_id) continue;
    countByCompany.set(c.company_id, (countByCompany.get(c.company_id) || 0) + 1);
  }

  const out = companies.map((c) => ({ ...c, tags: tagsByCompany.get(c.id) || [], contact_count: countByCompany.get(c.id) || 0 }));
  return json({ companies: out }, 200, origin);
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

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "outreach_company_created", entity_type: "outreach_company", entity_id: created?.id, details: { source: body.source || "manual" } }),
  });

  return json({ company: created }, 200, origin);
};
