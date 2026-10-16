// GET/POST /api/admin/email-schedules -- scheduled daily email drip for Companies
// (migration 0026). The actual sending is done by api/cron/email-schedules.ts.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { firstRunFrom, cleanDays } from "../../_shared/emailSchedule";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

async function dailyCap(env: AdminEnv): Promise<number> {
  try { const s = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" }); const v = s.ok ? ((await s.json()) as any[])?.[0]?.value : null; const o = typeof v === "string" ? JSON.parse(v) : v || {}; const n = Number(o.mktDailyCap); return n >= 10 && n <= 500 ? n : 40; } catch { return 40; }
}

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const r = await supaAdmin(env, "email_schedules?select=id,name,template_id,batch_size,send_time,days,next_index,next_run_at,status,sent_count,batches_done,last_run_at,last_note,filter_label,created_at,company_ids,email_templates(name)&order=created_at.desc&limit=100", { method: "GET" });
  if (!r.ok) return json({ schedules: [], ready: false, daily_cap: await dailyCap(env) }, 200, origin);
  const rows = ((await r.json()) as any[]).map(({ company_ids, ...s }) => ({ ...s, total: (company_ids || []).length }));
  return json({ schedules: rows, ready: true, daily_cap: await dailyCap(env) }, 200, origin);
};

// PATCH { daily_cap } -- the admin's own daily safe sending limit (nap_settings.mktDailyCap,
// the same value Email settings uses). 10-500; the sender enforces it for every send.
export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const b = (await request.json().catch(() => ({}))) as Record<string, any>;
  const cap = Math.floor(Number(b.daily_cap));
  if (!(cap >= 10 && cap <= 500)) return json({ error: "Daily limit must be between 10 and 500." }, 400, origin);
  const s = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" });
  const row = s.ok ? ((await s.json()) as any[])?.[0] : null;
  if (!row) return json({ error: "Settings not found." }, 404, origin);
  const wasString = typeof row.value === "string";
  const obj = wasString ? JSON.parse(row.value || "{}") : row.value || {};
  obj.mktDailyCap = cap;
  const r = await supaAdmin(env, "site_settings?key=eq.nap_settings", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ value: wasString ? JSON.stringify(obj) : obj }) });
  if (!r.ok) return json({ error: "Could not save the limit.", detail: await r.text() }, 500, origin);
  await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: `admin:${admin.email}`, action: "email_daily_cap_changed", entity_type: "settings", entity_id: null, details: { daily_cap: cap } }) });
  return json({ daily_cap: cap }, 200, origin);
};

// POST { name, template_id, company_ids[], start_row, batch_size, start_date, send_time, days[], filter_label }
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const b = (await request.json().catch(() => ({}))) as Record<string, any>;

  const ids = (Array.isArray(b.company_ids) ? b.company_ids : []).map(String).filter((x: string) => /^[0-9a-f-]{36}$/i.test(x));
  const startRow = Math.max(1, Math.floor(Number(b.start_row) || 1));
  const list = ids.slice(startRow - 1);
  if (!list.length) return json({ error: "No companies to send to from that starting row." }, 400, origin);
  if (!b.template_id) return json({ error: "Choose an email template." }, 400, origin);
  const batch = Math.min(500, Math.max(1, Math.floor(Number(b.batch_size) || 50)));
  const time = /^\d{1,2}:\d{2}$/.test(String(b.send_time)) ? String(b.send_time) : "10:00";
  const days = cleanDays(b.days);
  if (!days.length) return json({ error: "Pick at least one sending day." }, 400, origin);
  let first = firstRunFrom(String(b.start_date || new Date().toISOString().slice(0, 10)), time, days);
  if (first.getTime() < Date.now() - 60e3) first = new Date(); // start time already passed today -> start now

  const row = {
    name: String(b.name || "Scheduled email").slice(0, 140),
    template_id: b.template_id,
    company_ids: list,
    batch_size: batch,
    send_time: time,
    days,
    next_index: 0,
    next_run_at: first.toISOString(),
    status: "active",
    filter_label: String(b.filter_label || "").slice(0, 200) || null,
    created_by: admin.email,
  };
  const r = await supaAdmin(env, "email_schedules", { method: "POST", body: JSON.stringify(row) });
  if (!r.ok) return json({ error: "Could not save the schedule -- has migration 0026 been run?", detail: await r.text() }, 500, origin);
  const saved = ((await r.json()) as any[])?.[0];
  await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: `admin:${admin.email}`, action: "email_schedule_created", entity_type: "email_schedule", entity_id: saved?.id, details: { companies: list.length, batch, time, days } }) });
  return json({ schedule: saved }, 200, origin);
};
