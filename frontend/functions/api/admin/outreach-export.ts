// GET /api/admin/outreach-export -- full backup of the outreach database (companies,
// contacts, categories, tags and all their links), paged so nothing is cut off at 1000 rows.
// The browser turns this into an Excel workbook (Companies / Contacts / Categories sheets)
// whose column headers match the Import wizard, so a backup can be imported straight back.
import { requireAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { fetchAllRows } from "../../_shared/companyCategories";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const [companies, contacts, tags, companyTags, contactTags, categories, companyCats] = await Promise.all([
    fetchAllRows<any>(env, "outreach_companies?select=*&order=created_at.asc,id.asc"),
    fetchAllRows<any>(env, "outreach_contacts?select=*&order=created_at.asc,id.asc"),
    fetchAllRows<any>(env, "outreach_tags?select=id,name&order=name.asc"),
    fetchAllRows<any>(env, "outreach_company_tags?select=company_id,tag_id&order=company_id.asc,tag_id.asc"),
    fetchAllRows<any>(env, "outreach_contact_tags?select=contact_id,tag_id&order=contact_id.asc,tag_id.asc"),
    fetchAllRows<any>(env, "outreach_categories?select=id,name,sort_order&order=sort_order.asc"),
    fetchAllRows<any>(env, "outreach_company_categories?select=company_id,category_id&order=company_id.asc,category_id.asc"),
  ]);
  if (!companies || !contacts) return json({ error: "Could not read the database for export." }, 500, origin);

  return json({
    exported_at: new Date().toISOString(),
    companies,
    contacts,
    tags: tags || [],
    company_tags: companyTags || [],
    contact_tags: contactTags || [],
    categories: categories || [],
    company_categories: companyCats || [],
  }, 200, origin);
};
