// POST /api/admin/outreach-import/preview -- Step 3+4 of the Excel/CSV import wizard.
// Client has already parsed the file (SheetJS) and applied the column mapping (Step 2);
// this endpoint validates each row and checks it against the existing database for
// possible duplicates, WITHOUT writing anything. See outreach-import/commit.ts for the
// actual write step.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { isValidEmail, isValidPhone, fullNameOf } from "../../../_shared/outreachHelpers";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

type PreviewRow = Record<string, unknown>;

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { entity_type?: string; rows?: PreviewRow[] };
  const entityType = body.entity_type;
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (entityType !== "company" && entityType !== "contact") {
    return json({ error: "entity_type must be 'company' or 'contact'." }, 400, origin);
  }
  if (!rows.length) return json({ error: "No rows to preview." }, 400, origin);

  // Pull the existing companies/contacts once so every row can be checked in-memory
  // instead of firing one query per row (500-row imports would otherwise be very slow).
  const companiesRes = await supaAdmin(env, "outreach_companies?select=id,name,website", { method: "GET" });
  const existingCompanies = companiesRes.ok ? ((await companiesRes.json()) as any[]) : [];

  let existingContacts: any[] = [];
  if (entityType === "contact") {
    const contactsRes = await supaAdmin(env, "outreach_contacts?select=id,email,phone,whatsapp,full_name", { method: "GET" });
    existingContacts = contactsRes.ok ? ((await contactsRes.json()) as any[]) : [];
  }

  const norm = (v: unknown) => String(v || "").trim().toLowerCase();

  const results = rows.map((row, index) => {
    const errors: string[] = [];
    let duplicate: any = null;

    if (entityType === "company") {
      const name = norm(row.name);
      if (!name) errors.push("Missing company name.");
      if (!isValidEmail(row.email as string)) errors.push("Invalid email.");
      if (!isValidPhone(row.phone as string)) errors.push("Invalid phone.");
      const website = norm(row.website);
      duplicate = existingCompanies.find(
        (c) => (name && norm(c.name) === name) || (website && norm(c.website) === website)
      ) || null;
    } else {
      const name = fullNameOf(row as Record<string, unknown>);
      if (!name) errors.push("Missing contact name.");
      if (!isValidEmail(row.email as string)) errors.push("Invalid email.");
      if (!isValidPhone(row.phone as string)) errors.push("Invalid phone.");
      const email = norm(row.email);
      const phone = norm(row.phone);
      const whatsapp = norm(row.whatsapp);
      duplicate = existingContacts.find(
        (c) =>
          (email && norm(c.email) === email) ||
          (phone && norm(c.phone) === phone) ||
          (whatsapp && norm(c.whatsapp) === whatsapp)
      ) || null;
    }

    const status = errors.length ? "invalid" : duplicate ? "possible_duplicate" : "valid";
    return { row_index: index, data: row, status, errors, duplicate };
  });

  const summary = {
    total: results.length,
    valid: results.filter((r) => r.status === "valid").length,
    possible_duplicates: results.filter((r) => r.status === "possible_duplicate").length,
    invalid: results.filter((r) => r.status === "invalid").length,
  };

  return json({ summary, results }, 200, origin);
};
