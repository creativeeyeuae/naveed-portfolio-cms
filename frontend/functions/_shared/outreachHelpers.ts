// Shared helpers for the outreach Companies/Contacts foundation (Step 1). Used by
// companies.ts, contacts.ts, outreach-import/*, and business-cards/* -- kept here, not in
// any one of those route files, so none of them has to import another route file.
import { supaAdmin, type AdminEnv } from "./adminAuth";

// Finds an existing company by exact (case-insensitive) name or website match, else creates
// one. This is the one place "find or create" happens, so a company is never duplicated
// just because a second contact/row/scan names it again.
export async function findOrCreateCompany(
  env: AdminEnv,
  name?: string | null,
  website?: string | null,
  source?: string | null
): Promise<string | null> {
  const cleanName = (name || "").trim();
  if (!cleanName) return null;
  const filters: string[] = [`name.ilike.${encodeURIComponent(cleanName)}`];
  if (website && website.trim()) filters.push(`website.ilike.${encodeURIComponent(website.trim())}`);
  const existing = await supaAdmin(env, `outreach_companies?or=(${filters.join(",")})&select=id&limit=1`, { method: "GET" });
  const existingRows = existing.ok ? ((await existing.json()) as any[]) : [];
  if (existingRows?.[0]) return existingRows[0].id as string;

  const created = await supaAdmin(env, "outreach_companies", {
    method: "POST",
    body: JSON.stringify({ name: cleanName, website: website?.trim() || null, source: source || "manual" }),
  });
  if (!created.ok) return null;
  const rows = (await created.json()) as any[];
  return (rows?.[0]?.id as string) || null;
}

export function isValidEmail(v?: string | null): boolean {
  if (!v) return true; // empty is not "invalid", just missing
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isValidPhone(v?: string | null): boolean {
  if (!v) return true;
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function fullNameOf(row: Record<string, any>): string {
  const explicit = String(row.full_name || "").trim();
  if (explicit) return explicit;
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
}
