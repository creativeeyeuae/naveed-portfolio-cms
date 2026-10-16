// Shared helpers for the editable Company Categories (migration 0025:
// outreach_categories + outreach_company_categories). Every helper is fault-tolerant:
// if the migration hasn't been run yet, they return null/[] instead of throwing, so the
// Companies page and Lead Finder / Import keep working exactly as before.
import { supaAdmin, type AdminEnv } from "./adminAuth";

export type Category = { id: string; name: string; sort_order: number };

export async function loadCategories(env: AdminEnv): Promise<Category[] | null> {
  const r = await supaAdmin(env, "outreach_categories?select=id,name,sort_order&order=sort_order.asc,name.asc&limit=500", { method: "GET" });
  if (!r.ok) return null; // table missing -> migration not run yet
  return (await r.json()) as Category[];
}

// Reads every row of a REST query in pages -- Supabase caps a single response at 1000
// rows, which the Companies list (900+ records) is about to outgrow. `query` must include
// a stable `order=`. Returns null if the very first page fails (e.g. table missing).
export async function fetchAllRows<T = any>(env: AdminEnv, query: string, max = 50000): Promise<T[] | null> {
  const out: T[] = [];
  for (let offset = 0; offset < max; offset += 1000) {
    const r = await supaAdmin(env, `${query}&limit=1000&offset=${offset}`, { method: "GET" });
    if (!r.ok) return offset === 0 ? null : out;
    const rows = (await r.json()) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// All company<->category links.
export function loadAllCategoryLinks(env: AdminEnv) {
  return fetchAllRows<{ company_id: string; category_id: string }>(env, "outreach_company_categories?select=company_id,category_id&order=company_id.asc,category_id.asc");
}

// Same keyword rules as migration 0025's one-time pre-sort, used when a new company
// arrives (manual add with no categories picked, Lead Finder save, Excel/CSV import).
const RULES: [string, RegExp][] = [
  ["Mobile & Telecom", /(mobile|telecom|phone|cellular)/i],
  ["Interior Design", /(interior|fit.?out|furniture|decor|architect)/i],
  ["Real Estate", /(real.?estate|realty|propert|broker|developer)/i],
  ["Hotels & Tourism", /(hotel|resort|touris|travel|hospitality)/i],
  ["E-commerce", /(e.?commerce|online (store|shop)|marketplace)/i],
  ["Restaurants", /(restaurant|caf[eé]|dining|f ?& ?b|food|catering|bakery)/i],
  ["Healthcare", /(health|clinic|hospital|medical|dental|pharma)/i],
  ["Education", /(educat|school|universit|college|academy|training)/i],
];

export function suggestCategoryIds(categories: Category[], industry: unknown): string[] {
  const text = String(industry || "").trim();
  if (!text) return [];
  const ids: string[] = [];
  for (const cat of categories) {
    const rule = RULES.find(([n]) => n.toLowerCase() === cat.name.toLowerCase());
    // Rule match for the starter categories; for categories added later, a plain
    // "industry text contains the category name" match.
    const hit = rule ? rule[1].test(text) : text.toLowerCase().includes(cat.name.toLowerCase());
    if (hit) ids.push(cat.id);
  }
  return ids;
}

export async function linkCategories(env: AdminEnv, companyId: string, categoryIds: string[]): Promise<boolean> {
  const ids = Array.from(new Set(categoryIds.filter(Boolean)));
  if (!companyId || !ids.length) return true;
  const r = await supaAdmin(env, "outreach_company_categories", {
    method: "POST",
    headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify(ids.map((category_id) => ({ company_id: companyId, category_id }))),
  });
  return r.ok;
}

// Convenience for Lead Finder / Import: auto-file a new company by its industry text.
// Pass a pre-loaded category list when calling in a loop.
export async function autoCategorize(env: AdminEnv, companyId: string, industry: unknown, categories?: Category[] | null) {
  try {
    const cats = categories === undefined ? await loadCategories(env) : categories;
    if (!cats || !cats.length) return;
    await linkCategories(env, companyId, suggestCategoryIds(cats, industry));
  } catch { /* never block the save over categories */ }
}
