// GET/POST /api/admin/contacts -- the outreach Contacts database. A contact can optionally
// belong to a company (outreach_companies), found-or-created here so the same company is
// never duplicated just because a second contact there gets added.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { findOrCreateCompany } from "../../_shared/outreachHelpers";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "outreach_contacts?select=*,outreach_companies(id,name)&order=created_at.desc&limit=1000", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load contacts.", detail: await res.text() }, 500, origin);
  const contacts = (await res.json()) as any[];

  const tagRes = await supaAdmin(env, "outreach_contact_tags?select=contact_id,outreach_tags(id,name)", { method: "GET" });
  const tagLinks = tagRes.ok ? ((await tagRes.json()) as any[]) : [];
  const tagsByContact = new Map<string, any[]>();
  for (const t of tagLinks) {
    if (!t.contact_id || !t.outreach_tags) continue;
    if (!tagsByContact.has(t.contact_id)) tagsByContact.set(t.contact_id, []);
    tagsByContact.get(t.contact_id)!.push(t.outreach_tags);
  }

  const out = contacts.map((c) => ({ ...c, tags: tagsByContact.get(c.id) || [] }));
  return json({ contacts: out }, 200, origin);
};

// POST -- creates a contact. Checks email/phone/whatsapp for a possible existing match first
// (unless force:true) and returns 409 with the match instead of creating a duplicate.
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const firstName = body.first_name ? String(body.first_name).trim() : "";
  const lastName = body.last_name ? String(body.last_name).trim() : "";
  const fullName = String(body.full_name || `${firstName} ${lastName}`).trim();
  if (!fullName) return json({ error: "A name is required." }, 400, origin);
  const email = body.email ? String(body.email).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const whatsapp = body.whatsapp ? String(body.whatsapp).trim() : null;

  if (!body.force && (email || phone || whatsapp)) {
    const filters: string[] = [];
    if (email) filters.push(`email.eq.${encodeURIComponent(email)}`);
    if (phone) filters.push(`phone.eq.${encodeURIComponent(phone)}`);
    if (whatsapp) filters.push(`whatsapp.eq.${encodeURIComponent(whatsapp)}`);
    const dupRes = await supaAdmin(env, `outreach_contacts?or=(${filters.join(",")})&select=*&limit=1`, { method: "GET" });
    const dupRows = dupRes.ok ? ((await dupRes.json()) as any[]) : [];
    if (dupRows?.[0]) return json({ duplicate: dupRows[0] }, 409, origin);
  }

  let companyId = body.company_id ? String(body.company_id) : null;
  if (!companyId && body.company_name) {
    companyId = await findOrCreateCompany(env, String(body.company_name), body.company_website ? String(body.company_website) : null, String(body.source || "manual"));
  }

  const row: Record<string, unknown> = {
    company_id: companyId,
    first_name: firstName || null,
    last_name: lastName || null,
    full_name: fullName,
    job_title: body.job_title || null,
    email,
    phone,
    whatsapp,
    website: body.website || null,
    linkedin: body.linkedin || null,
    country: body.country || null,
    city: body.city || null,
    address: body.address || null,
    notes: body.notes || null,
    card_image_url: body.card_image_url || null,
    status: body.status || "prospect",
    source: body.source || "manual",
  };
  const res = await supaAdmin(env, "outreach_contacts", { method: "POST", body: JSON.stringify(row) });
  if (!res.ok) return json({ error: "Could not create contact.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  const created = rows?.[0];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "outreach_contact_created", entity_type: "outreach_contact", entity_id: created?.id, details: { source: body.source || "manual" } }),
  });

  return json({ contact: created }, 200, origin);
};
