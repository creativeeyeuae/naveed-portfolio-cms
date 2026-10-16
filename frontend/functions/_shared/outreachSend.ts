// Outreach (Companies / Contacts) email sender, shared by the manual "Send" button
// (api/admin/email/campaigns/[id]/send.ts) and the scheduled daily drip
// (api/cron/email-schedules.ts). Moved here unchanged except for the optional opts.maxSend
// chunking used by the scheduler.
import { supaAdmin, json, type AdminEnv } from "./adminAuth";
import { renderTemplate, substituteVariables, type EmailBlock } from "./emailRender";
import { resendPayload } from "./emailDeliver";

export type Env = AdminEnv & { RESEND_API_KEY?: string; EMAIL_FROM?: string; EMAIL_FROM_NAME?: string; EMAIL_REPLY_TO?: string };
const MAX_RECIPIENTS = 300;

const SELECT_OUTREACH = "id,first_name,last_name,full_name,email,job_title,status,company:outreach_companies(name)";

// ── Safe-sending guard rails for contacts / leads (protects the domain from spam reports & blocks)
const SITE = "https://bynaveedanjum.com";
async function dailyCap(env: Env): Promise<number> {
  try { const s = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" }); const v = s.ok ? ((await s.json()) as any[])?.[0]?.value : null; const o = typeof v === "string" ? JSON.parse(v) : v || {}; const n = Number(o.mktDailyCap); return n >= 10 && n <= 500 ? n : 40; } catch { return 40; }
}
async function sentToday(env: Env): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const r = await supaAdmin(env, `email_messages?status=eq.sent&sent_at=gte.${since}&select=id`, { method: "GET", headers: { Prefer: "count=exact", Range: "0-0" } });
  const m = /\/(\d+)$/.exec(r.headers.get("content-range") || ""); return m ? Number(m[1]) : 0;
}
async function blockedEmails(env: Env, campaignId: string): Promise<Set<string>> {
  const out = new Set<string>();
  const u = await supaAdmin(env, "audit_log?action=eq.email_unsubscribed&select=details&limit=5000", { method: "GET" });
  for (const x of (u.ok ? ((await u.json()) as any[]) : [])) if (x?.details?.email) out.add(String(x.details.email).toLowerCase());
  const f = await supaAdmin(env, "email_messages?status=eq.failed&select=to_email&limit=5000", { method: "GET" });
  for (const x of (f.ok ? ((await f.json()) as any[]) : [])) if (x?.to_email) out.add(String(x.to_email).toLowerCase());
  // Anyone already handled in this campaign (sent or skipped) -- so a campaign that's continued
  // later (daily limit / scheduled chunks) never emails or re-logs the same person twice.
  const s = await supaAdmin(env, `email_messages?campaign_id=eq.${campaignId}&status=in.(sent,skipped_no_email,skipped_no_consent)&select=to_email&limit=5000`, { method: "GET" });
  for (const x of (s.ok ? ((await s.json()) as any[]) : [])) if (x?.to_email) out.add(String(x.to_email).toLowerCase());
  return out;
}
const mxCache = new Map<string, boolean>();
async function hasMx(email: string): Promise<boolean> {
  const d = email.split("@")[1]; if (mxCache.has(d)) return mxCache.get(d)!;
  let ok = true; try { const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(d)}&type=MX`, { headers: { Accept: "application/dns-json" } }); const j: any = await r.json(); ok = Array.isArray(j.Answer) && j.Answer.length > 0; } catch {}
  mxCache.set(d, ok); return ok;
}

export async function sendToOutreach(env: Env, campaign: any, template: any, campaignId: string, audience: any, adminEmail: string, origin: string | null, opts: { maxSend?: number } = {}) {
  let contacts: any[] = [];
  // Companies picked directly (Companies list → select → Send email), or companies carrying the
  // tag: send to each company's people; a company with no person on file gets its own
  // company email instead, so imported company lists can be emailed straight away.
  const addCompanies = async (companyIds: string[]) => {
    const ids = companyIds.filter((x) => /^[0-9a-f-]{36}$/i.test(String(x))).slice(0, MAX_RECIPIENTS);
    if (!ids.length) return;
    for (let i = 0; i < ids.length; i += 80) {
      const part = ids.slice(i, i + 80).join(",");
      const pr = await supaAdmin(env, `outreach_contacts?company_id=in.(${part})&select=${SELECT_OUTREACH},company_id`, { method: "GET" });
      const people = pr.ok ? ((await pr.json()) as any[]) : [];
      contacts.push(...people);
      const withPerson = new Set(people.filter((p) => p.email).map((p) => p.company_id));
      const cr = await supaAdmin(env, `outreach_companies?id=in.(${part})&select=id,name,email,status`, { method: "GET" });
      for (const co of cr.ok ? ((await cr.json()) as any[]) : []) {
        if (!withPerson.has(co.id) && co.email) contacts.push({ id: co.id, first_name: "", last_name: "", full_name: "", email: co.email, job_title: "", status: co.status, company: { name: co.name } });
      }
    }
  };
  if (audience.type === "outreach_companies" && Array.isArray(audience.company_ids)) {
    await addCompanies(audience.company_ids);
  } else if (audience.type === "outreach_tag" && audience.tag_id) {
    const r = await supaAdmin(env, `outreach_contact_tags?tag_id=eq.${encodeURIComponent(audience.tag_id)}&select=contact:outreach_contacts(${SELECT_OUTREACH})&limit=${MAX_RECIPIENTS}`, { method: "GET" });
    const rows = r.ok ? ((await r.json()) as any[]) : [];
    contacts = rows.map((row) => row.contact).filter(Boolean);
    const ct = await supaAdmin(env, `outreach_company_tags?tag_id=eq.${encodeURIComponent(audience.tag_id)}&select=company_id&limit=${MAX_RECIPIENTS}`, { method: "GET" });
    const tagged = (ct.ok ? ((await ct.json()) as any[]) : []).map((x) => x.company_id);
    if (tagged.length) { const already = new Set(contacts.map((c) => String(c.email || "").toLowerCase())); const before = contacts.length; await addCompanies(tagged); contacts = contacts.slice(0, before).concat(contacts.slice(before).filter((c) => !already.has(String(c.email || "").toLowerCase()))); }
  } else {
    const r = await supaAdmin(env, `outreach_contacts?select=${SELECT_OUTREACH}&order=created_at.desc&limit=${MAX_RECIPIENTS}`, { method: "GET" });
    contacts = r.ok ? await r.json() : [];
  }

  let sent = 0, failed = 0, skippedNoEmail = 0, skippedNoConsent = 0;
  const seen = new Set<string>();
  const blocked = await blockedEmails(env, campaignId);
  const allowance = Math.max(0, (await dailyCap(env)) - (await sentToday(env)));
  let paused = "";
  const { sign } = await import("./bookingVerify");
  let handled = 0; // scheduler chunking: stop after opts.maxSend recipients, continue next tick
  for (const c of contacts) {
    if (sent >= allowance) { paused = "daily_limit"; break; }
    if (opts.maxSend && handled >= opts.maxSend) { paused = "chunk"; break; }
    if (opts.maxSend) { // scheduled runs: skip no-email / already-handled people without spending the chunk
      const e0 = String(c.email || "").trim().toLowerCase();
      if (!e0 || blocked.has(e0) || seen.has(e0)) continue;
    }
    handled++;
    if (sent + failed >= 15 && failed / (sent + failed) > 0.1) { paused = "too_many_failures"; break; }
    const email = String(c.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await logMessage(env, campaignId, null, email || "(none)", "skipped_no_email", `${c.full_name || ""}`.trim() || null); skippedNoEmail++; continue; }
    if (seen.has(email)) continue; // same person twice in the list -- send once
    seen.add(email);
    if (c.status === "inactive") { await logMessage(env, campaignId, null, email, "skipped_no_consent", "Contact marked inactive (do not contact)."); skippedNoConsent++; continue; }
    if (blocked.has(email)) continue; // unsubscribed, bounced before, or already sent in this campaign
    if (!(await hasMx(email))) { await logMessage(env, campaignId, null, email, "skipped_no_email", "Email domain has no mail server."); skippedNoEmail++; continue; }

    const full = String(c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).trim();
    const vars = {
      first_name: c.first_name || full.split(/\s+/)[0] || "",
      last_name: c.last_name || full.split(/\s+/).slice(1).join(" "),
      company: c.company?.name || "",
      job_title: c.job_title || "",
    };
    const unsubUrl = `${SITE}/api/unsubscribe?t=${encodeURIComponent(await sign(env, { u: email, exp: Date.now() + 365 * 86400e3 }))}`;
    const footer = `<div style="text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#8a8296;padding:14px 10px 24px">Not interested? <a href="${unsubUrl}" style="color:#8a8296;text-decoration:underline">Unsubscribe</a> — you won't hear from us again.</div>`;
    let html = renderTemplate((template.blocks || []) as EmailBlock[], vars);
    html = html.includes("</body>") ? html.replace("</body>", footer + "</body>") : html + footer;
    const subject = substituteVariables(template.subject || template.name, vars).replace(/&amp;/g, "&");
    try {
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(resendPayload(env, email, subject, html, { unsubscribeUrl: unsubUrl })),
      });
      if (sendRes.ok) { await logMessage(env, campaignId, null, email, "sent", null); sent++; }
      else { await logMessage(env, campaignId, null, email, "failed", (await sendRes.text()).slice(0, 500)); failed++; }
    } catch (e: any) {
      await logMessage(env, campaignId, null, email, "failed", e?.message || "Send failed.");
      failed++;
    }
    // Stay under the email provider's per-second rate limit.
    await new Promise((res) => setTimeout(res, 600));
  }

  // Keep Companies in sync: a prospect that was just emailed becomes "contacted".
  if (sent && audience.type === "outreach_companies" && Array.isArray(audience.company_ids)) {
    const ids = audience.company_ids.filter((x: any) => /^[0-9a-f-]{36}$/i.test(String(x)));
    for (let i = 0; i < ids.length; i += 80) await supaAdmin(env, `outreach_companies?id=in.(${ids.slice(i, i + 80).join(",")})&status=eq.prospect`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "contacted", updated_at: new Date().toISOString() }) });
  }
  // Paused (daily limit / failures) -> back to draft so "Send Now" continues later with the rest.
  await supaAdmin(env, `email_campaigns?id=eq.${campaignId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(paused ? { status: "draft" } : { status: "sent", sent_at: new Date().toISOString() }) });
  await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: `admin:${adminEmail}`, action: "email_campaign_sent", entity_type: "email_campaign", entity_id: campaignId, details: { audience: audience.type, sent, failed, skippedNoEmail, skippedNoConsent, paused } }) });
  return json({ ok: true, sent, failed, skipped_no_email: skippedNoEmail, skipped_no_consent: skippedNoConsent, paused, note: paused === "daily_limit" ? "Daily safe-sending limit reached. Click Send Now again tomorrow to continue with the remaining contacts." : paused === "too_many_failures" ? "Stopped automatically: too many emails failed. Please check the list before sending again." : "" }, 200, origin);
}

export async function logMessage(env: Env, campaignId: string, customerId: string | null, toEmail: string, status: string, error: string | null) {
  await supaAdmin(env, "email_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ campaign_id: campaignId, customer_id: customerId, to_email: toEmail, status, error, sent_at: status === "sent" ? new Date().toISOString() : null }),
  });
}
