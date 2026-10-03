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

// ─── Normalization (Part 3) ─────────────────────────────────────────────
// Deterministic only -- no AI involved. Used before duplicate-matching so
// two differently-formatted versions of the same number/address are
// actually recognized as the same thing, which the raw string match below
// (and in save.ts/contacts.ts/outreach-import) could not do on its own.

// Normalizes a phone number to E.164 ONLY when a country can be inferred
// without guessing: either it's already got a "+" prefix (kept as-is, just
// stripped of spacing), or it matches the UAE mobile shape (05X followed by
// 7 digits, the common local format on UAE business cards) and gets +971
// prefixed. Anything else is returned exactly as typed -- never assume a
// country that isn't actually indicated.
export function normalizePhone(v?: string | null): string {
  if (!v) return "";
  const trimmed = v.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (hasPlus) return `+${digits}`;
  if (/^00\d+/.test(digits)) return `+${digits.slice(2)}`; // "00" international prefix
  if (/^05\d{8}$/.test(digits)) return `+971${digits.slice(1)}`; // UAE mobile, local format
  return trimmed; // leave as printed; the admin can correct it in review
}

export function normalizeEmail(v?: string | null): string {
  if (!v) return "";
  return v.trim().toLowerCase();
}

// "example.com" / "www.example.com" / "https://example.com" -> one form.
// Never applied to a value that already looks like an email address.
export function normalizeUrl(v?: string | null): string {
  if (!v) return "";
  const trimmed = v.trim();
  if (!trimmed || trimmed.includes("@")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^www\./i, "")}`;
}

// Extracted fields that have no dedicated CRM column yet (see the Part 2
// audit's database-impact section) are folded into readable, still-editable
// notes text rather than silently discarded. Only ever called with values
// the extraction actually found on the card -- never fabricated.
export function extraFieldsAsNotes(extra: Record<string, string | undefined>): string {
  const labels: Record<string, string> = {
    mobile: "Mobile", secondary_email: "Secondary email", fax: "Fax",
    instagram: "Instagram", facebook: "Facebook", twitter: "X/Twitter",
  };
  const lines = Object.entries(extra)
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `${labels[k] || k}: ${v}`);
  return lines.length ? `From scanned card -- ${lines.join(" | ")}` : "";
}
