// GET/PATCH/DELETE /api/admin/companies/:id
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const res = await supaAdmin(env, `outreach_companies?id=eq.${id}&select=*&limit=1`, { method: "GET" });
  const rows = res.ok ? ((await res.json()) as any[]) : [];
  const company = rows?.[0];
  if (!company) return json({ error: "Company not found." }, 404, origin);

  const tagRes = await supaAdmin(env, `outreach_company_tags?company_id=eq.${id}&select=outreach_tags(id,name)`, { method: "GET" });
  const tagLinks = tagRes.ok ? ((await tagRes.json()) as any[]) : [];
  company.tags = tagLinks.map((t) => t.outreach_tags).filter(Boolean);

  const contactsRes = await supaAdmin(env, `outreach_contacts?company_id=eq.${id}&select=*&order=created_at.desc`, { method: "GET" });
  company.contacts = contactsRes.ok ? await contactsRes.json() : [];

  return json({ company }, 200, origin);
};

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = ["name", "industry", "website", "email", "phone", "whatsapp", "country", "city", "address", "linkedin", "notes", "status", "source"];
  const fields: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) fields[k] = body[k];
  fields.updated_at = new Date().toISOString();

  const res = await supaAdmin(env, `outreach_companies?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(fields) });
  if (!res.ok) return json({ error: "Could not update company.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ company: rows?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const res = await supaAdmin(env, `outreach_companies?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete company.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
