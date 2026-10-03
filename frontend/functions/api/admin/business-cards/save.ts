// POST /api/admin/business-cards/save -- Step after the user reviews scanned/typed card data
// (the frontend always shows a review screen first; nothing from scan.ts is auto-saved).
// Creates (or updates, if the user chose an existing match) an outreach contact, links it to
// its company via find-or-create, and tags it if requested. Mirrors contacts.ts' create path
// with source forced to "business_card" and the card photo URL stored on the contact.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { findOrCreateCompany, isValidEmail, isValidPhone, fullNameOf, normalizePhone, normalizeEmail, normalizeUrl } from "../../../_shared/outreachHelpers";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

// POST { data: {...reviewed fields...}, tag_name?, force? }
// data may include: first_name, last_name, full_name, job_title, email, phone, whatsapp,
// website, linkedin, country, city, address, notes, card_image_url, company_name, company_website.
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;

  const fullName = fullNameOf(data);
  if (!fullName) return json({ error: "Contact name is required." }, 400, origin);
  if (!isValidEmail(data.email as string)) return json({ error: "Invalid email." }, 400, origin);
  if (!isValidPhone(data.phone as string)) return json({ error: "Invalid phone." }, 400, origin);

  // Normalize before matching/storing (Part 3) so "050 123 4567" and "+971501234567" are
  // recognized as the same number, and URLs/emails compare consistently. Deterministic only.
  const normEmail = normalizeEmail(data.email as string);
  const normPhone = normalizePhone(data.phone as string);
  const normWhatsapp = normalizePhone(data.whatsapp as string);
  const normWebsite = normalizeUrl(data.website as string);
  const normCompanyWebsite = normalizeUrl(data.company_website as string);

  // Before saving, check for a possible duplicate (email/phone/whatsapp) unless the caller
  // already resolved that decision (force:true, from a review-screen "Save anyway").
  let possibleMatch: any = null;
  if (!body.force) {
    const filters: string[] = [];
    if (normEmail) filters.push(`email.ilike.${encodeURIComponent(normEmail)}`);
    if (normPhone) filters.push(`phone.ilike.${encodeURIComponent(normPhone)}`);
    if (normWhatsapp) filters.push(`whatsapp.ilike.${encodeURIComponent(normWhatsapp)}`);
    if (filters.length) {
      const dupRes = await supaAdmin(env, `outreach_contacts?or=(${filters.join(",")})&select=*&limit=1`, { method: "GET" });
      const dupRows = dupRes.ok ? ((await dupRes.json()) as any[]) : [];
      if (dupRows?.[0]) return json({ duplicate: dupRows[0] }, 409, origin);
    }
    // No exact email/phone/whatsapp match -- check the weaker name+company signal as a
    // non-blocking suggestion only (never auto-merged, never blocks the save).
    if (data.company_name && fullName) {
      const weakRes = await supaAdmin(
        env,
        `outreach_contacts?full_name.ilike.${encodeURIComponent(fullName)}&select=*,company:outreach_companies(name)&limit=5`,
        { method: "GET" }
      );
      const weakRows = weakRes.ok ? ((await weakRes.json()) as any[]) : [];
      possibleMatch = weakRows.find((r) => r.company?.name && String(r.company.name).toLowerCase() === String(data.company_name).toLowerCase()) || null;
    }
    // Same name + same company, but no matching email/phone/whatsapp -- too weak to block
    // automatically (per the "no vague fuzzy matching" instruction), so surface it and let
    // the admin decide, same as the hard-duplicate banner but distinguished by status 200
    // (not 409) since this is a suggestion, not a confirmed match.
    if (possibleMatch) return json({ possible_match: possibleMatch }, 200, origin);
  }

  let companyId: string | null = null;
  if (data.company_name) {
    companyId = await findOrCreateCompany(env, data.company_name as string, normCompanyWebsite || undefined, "business_card");
  }

  const row: Record<string, unknown> = {
    company_id: companyId,
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    full_name: fullName,
    job_title: data.job_title || null,
    email: normEmail || null,
    phone: normPhone || null,
    whatsapp: normWhatsapp || null,
    website: normWebsite || null,
    linkedin: data.linkedin || null,
    country: data.country || null,
    city: data.city || null,
    address: data.address || null,
    notes: data.notes || null,
    card_image_url: data.card_image_url || null,
    source: "business_card",
  };
  const res = await supaAdmin(env, "outreach_contacts", { method: "POST", body: JSON.stringify(row) });
  if (!res.ok) return json({ error: "Could not save contact.", detail: await res.text() }, 500, origin);
  const created = ((await res.json()) as any[])?.[0];

  // Best-effort: close the loop on the scan record this contact came from (Part 3). Never
  // blocks the save -- the scan table may not exist yet (migration 0012 not run) or the id
  // may simply be absent (e.g. the admin typed everything in by hand with no scan at all).
  const scanId = (body.scan_id as string | undefined) || undefined;
  if (scanId && created?.id) {
    try {
      await supaAdmin(env, `business_card_scans?id=eq.${encodeURIComponent(scanId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "converted", created_contact_id: created.id, updated_at: new Date().toISOString() }),
      });
    } catch {}
  }

  const tagName = (body.tag_name as string | undefined)?.trim();
  if (tagName && created?.id) {
    const existing = await supaAdmin(env, `outreach_tags?select=id&name=eq.${encodeURIComponent(tagName)}&limit=1`, { method: "GET" });
    const existingRows = existing.ok ? ((await existing.json()) as any[]) : [];
    let tagId = existingRows?.[0]?.id;
    if (!tagId) {
      const createdTag = await supaAdmin(env, "outreach_tags", { method: "POST", body: JSON.stringify({ name: tagName }) });
      if (createdTag.ok) tagId = ((await createdTag.json()) as any[])?.[0]?.id;
    }
    if (tagId) {
      await supaAdmin(env, "outreach_contact_tags", {
        method: "POST",
        headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
        body: JSON.stringify({ contact_id: created.id, tag_id: tagId }),
      });
    }
  }

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "outreach_contact_created", entity_type: "outreach_contact", entity_id: created?.id, details: { source: "business_card" } }),
  });

  return json({ contact: created }, 200, origin);
};
