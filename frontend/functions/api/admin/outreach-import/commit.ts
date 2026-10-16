// POST /api/admin/outreach-import/commit -- Step 5+6 of the import wizard. Writes the rows
// the user already reviewed in preview.ts, honoring each row's chosen action
// (skip / update existing / create new) so nothing is silently overwritten.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { findOrCreateCompany, fullNameOf } from "../../../_shared/outreachHelpers";
import { loadCategories, autoCategorize, type Category } from "../../../_shared/companyCategories";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

type CommitRow = {
  data: Record<string, unknown>;
  action: "skip" | "update" | "create";
  duplicate_id?: string;
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as {
    entity_type?: string;
    rows?: CommitRow[];
    tag_name?: string;
    source?: string;
  };
  const entityType = body.entity_type;
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const source = (body.source || "excel_import").trim();
  if (entityType !== "company" && entityType !== "contact") {
    return json({ error: "entity_type must be 'company' or 'contact'." }, 400, origin);
  }
  if (!rows.length) return json({ error: "No rows to import." }, 400, origin);

  // Step 5: one tag applied to the whole import. Find-or-create it once up front.
  let tagId: string | undefined;
  const tagName = (body.tag_name || "").trim();
  if (tagName) {
    const existing = await supaAdmin(env, `outreach_tags?select=id&name=eq.${encodeURIComponent(tagName)}&limit=1`, { method: "GET" });
    const existingRows = existing.ok ? ((await existing.json()) as any[]) : [];
    if (existingRows?.[0]) {
      tagId = existingRows[0].id;
    } else {
      const created = await supaAdmin(env, "outreach_tags", { method: "POST", body: JSON.stringify({ name: tagName }) });
      if (created.ok) tagId = ((await created.json()) as any[])?.[0]?.id;
    }
  }

  let importCats: Category[] | null | undefined; // loaded lazily, once, for auto-filing new companies
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row_index: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.action === "skip") {
      skipped++;
      continue;
    }
    try {
      if (entityType === "company") {
        const fields: Record<string, unknown> = {
          name: String(row.data.name || "").trim(),
          industry: row.data.industry || null,
          website: row.data.website || null,
          email: row.data.email || null,
          phone: row.data.phone || null,
          whatsapp: row.data.whatsapp || null,
          country: row.data.country || null,
          city: row.data.city || null,
          address: row.data.address || null,
          linkedin: row.data.linkedin || null,
          notes: row.data.notes || null,
          source,
        };
        if (row.action === "update" && row.duplicate_id) {
          // Fill in only what's missing -- never blank out or overwrite existing data.
          await fillMissing(env, "outreach_companies", row.duplicate_id, fields);
          const companyId = row.duplicate_id;
          if (tagId) await linkTag(env, "outreach_company_tags", "company_id", companyId, tagId);
          updated++;
        } else {
          const res = await supaAdmin(env, "outreach_companies", { method: "POST", body: JSON.stringify(fields) });
          if (!res.ok) throw new Error(await res.text());
          const created = ((await res.json()) as any[])?.[0];
          if (tagId && created?.id) await linkTag(env, "outreach_company_tags", "company_id", created.id, tagId);
          if (created?.id) {
            if (importCats === undefined) importCats = await loadCategories(env).catch(() => null);
            await autoCategorize(env, created.id, fields.industry, importCats);
          }
          imported++;
        }
      } else {
        let companyId: string | null = null;
        if (row.data.company_name) {
          companyId = await findOrCreateCompany(env, row.data.company_name as string, row.data.company_website as string | undefined, source);
        }
        const fields: Record<string, unknown> = {
          company_id: companyId,
          first_name: row.data.first_name || null,
          last_name: row.data.last_name || null,
          full_name: fullNameOf(row.data) || null,
          job_title: row.data.job_title || null,
          email: row.data.email || null,
          phone: row.data.phone || null,
          whatsapp: row.data.whatsapp || null,
          website: row.data.website || null,
          linkedin: row.data.linkedin || null,
          country: row.data.country || null,
          city: row.data.city || null,
          address: row.data.address || null,
          notes: row.data.notes || null,
          source,
        };
        if (row.action === "update" && row.duplicate_id) {
          // Fill in only what's missing -- never blank out or overwrite existing data.
          await fillMissing(env, "outreach_contacts", row.duplicate_id, fields);
          if (tagId) await linkTag(env, "outreach_contact_tags", "contact_id", row.duplicate_id, tagId);
          updated++;
        } else {
          const res = await supaAdmin(env, "outreach_contacts", { method: "POST", body: JSON.stringify(fields) });
          if (!res.ok) throw new Error(await res.text());
          const created = ((await res.json()) as any[])?.[0];
          if (tagId && created?.id) await linkTag(env, "outreach_contact_tags", "contact_id", created.id, tagId);
          imported++;
        }
      }
    } catch (e) {
      errors.push({ row_index: i, error: e instanceof Error ? e.message : "Unknown error." });
    }
  }

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "outreach_import_committed",
      entity_type: `outreach_${entityType}`,
      entity_id: null,
      details: { imported, updated, skipped, errors: errors.length, tag: tagName || null, source },
    }),
  });

  return json({ total: rows.length, imported, updated, skipped, duplicates: rows.filter((r) => r.action === "update").length, errors }, 200, origin);
};

// "Update existing" = merge, not replace. Reads the current record and only writes fields
// that are empty there and present in the import. Existing values are never overwritten or
// cleared (an empty cell in the spreadsheet used to wipe the saved value -- that was the
// data-loss bug). Notes are appended instead of replaced. `source` is kept as it was.
const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
async function fillMissing(env: AdminEnv, table: string, id: string, incoming: Record<string, unknown>) {
  const cur = await supaAdmin(env, `${table}?id=eq.${id}&select=*&limit=1`, { method: "GET" });
  if (!cur.ok) throw new Error(await cur.text());
  const existing = ((await cur.json()) as any[])?.[0];
  if (!existing) throw new Error("Existing record not found.");
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (k === "source" || k === "updated_at" || isEmpty(v)) continue;
    if (k === "notes") {
      const oldNotes = String(existing.notes || "");
      if (!oldNotes.includes(String(v).trim())) patch.notes = oldNotes ? `${oldNotes}\n${String(v).trim()}` : v;
      continue;
    }
    if (k in existing && isEmpty(existing[k])) patch[k] = v;
  }
  if (!Object.keys(patch).length) return;
  patch.updated_at = new Date().toISOString();
  const res = await supaAdmin(env, `${table}?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error(await res.text());
}

// Links a tag to a just-created/updated row, ignoring an already-existing link.
async function linkTag(env: AdminEnv, table: string, idColumn: string, id: string, tagId: string) {
  await supaAdmin(env, table, {
    method: "POST",
    headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify({ [idColumn]: id, tag_id: tagId }),
  });
}
