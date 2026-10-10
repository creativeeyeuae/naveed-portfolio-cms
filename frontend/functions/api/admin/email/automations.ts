// /api/admin/email/automations (admin only)
//   GET  -> which automated-email templates exist (by name)
//   POST { action: "install" } -> adds the automated-email designs as normal, editable templates.
//        Only creates the ones that are MISSING -- never overwrites or deletes an existing template.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { buildAutomationTemplates } from "../../../../lib/emailAutomationTemplates";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

async function existingNames(env: any): Promise<Set<string>> {
  const r = await supaAdmin(env, "email_templates?select=name&limit=1000", { method: "GET" });
  const rows = r.ok ? ((await r.json()) as any[]) : [];
  return new Set(rows.map((x) => String(x.name || "").trim().toLowerCase()));
}

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const have = await existingNames(env);
  return json({ automations: buildAutomationTemplates().map((t) => ({ key: t.key, name: t.name, trigger: t.trigger, installed: have.has(t.name.toLowerCase()) })) }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const body = (await request.json().catch(() => ({}))) as any;
  if (body?.action !== "install") return json({ error: "Unknown action." }, 400, origin);

  let site: any = {};
  try { const s = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" }); const v = s.ok ? ((await s.json()) as any[])?.[0]?.value : null; site = typeof v === "string" ? JSON.parse(v) : v || {}; } catch {}
  const ok = (u: any) => typeof u === "string" && /^https:\/\//i.test(u);
  const heroImages = (site.heroSlides || []).map((h: any) => h?.img).filter(ok);
  const brand: any = { heroImages };
  for (const [k, sk] of [["name", "aboutName"], ["phone", "phone"], ["email", "email"], ["waNumber", "waNumber"], ["instagram", "instagram"], ["youtube", "youtube"], ["linkedin", "linkedin"], ["tiktok", "tiktok"]] as const) if (site[sk]) brand[k] = site[sk];
  if (site.address || site.location) brand.address = site.address || site.location;

  const have = await existingNames(env);
  const added: string[] = [], skipped: string[] = [];
  for (const t of buildAutomationTemplates(brand)) {
    if (have.has(t.name.toLowerCase())) { skipped.push(t.name); continue; }
    const r = await supaAdmin(env, "email_templates", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name: t.name, subject: t.subject, blocks: t.blocks, created_by: admin.email }) });
    if (r.ok) added.push(t.name);
  }
  return json({ ok: true, added, skipped }, 200, origin);
};
