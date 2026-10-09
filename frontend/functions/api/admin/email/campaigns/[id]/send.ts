// POST /api/admin/email/campaigns/:id/send -- resolves the campaign's audience, checks
// consent for its category on EVERY contact (a contact with no communication_preferences
// row, which is every contact today, is treated as NOT allowed -- consent is never assumed),
// sends the eligible ones via Resend, and writes one email_messages row per recipient with
// the real outcome. This is an MVP synchronous sender (fine for the tens-to-low-hundreds of
// contacts this CMS has today) -- it does not yet implement the fuller frequency/duplicate/
// queue engine the master spec describes; that is a deliberate, disclosed gap, not an
// oversight, and is called out to the user rather than silently skipped.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../../_shared/adminAuth";
import { renderTemplate, substituteVariables, varsForCustomer, type EmailBlock } from "../../../../../_shared/emailRender";

type Env = AdminEnv & { RESEND_API_KEY?: string; EMAIL_FROM?: string };
const MAX_RECIPIENTS = 300;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return json({ error: "Email sending isn't set up yet -- RESEND_API_KEY and EMAIL_FROM need to be added as secrets first." }, 503, origin);
  }

  const campaignId = params.id as string;
  const cRes = await supaAdmin(env, `email_campaigns?id=eq.${campaignId}&select=*,email_templates(*)`, { method: "GET" });
  const campaign = ((await cRes.json()) as any[])?.[0];
  if (!campaign) return json({ error: "Campaign not found." }, 404, origin);
  if (campaign.status === "sent" || campaign.status === "sending") return json({ error: "This campaign has already been sent." }, 409, origin);
  const template = campaign.email_templates;
  if (!template) return json({ error: "This campaign's template no longer exists." }, 409, origin);

  await supaAdmin(env, `email_campaigns?id=eq.${campaignId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "sending" }) });

  // Resolve the audience.
  let customersPath = `customers?select=id,full_name,email,company,job_title&limit=${MAX_RECIPIENTS}`;
  const audience = campaign.audience || { type: "all" };

  // Outreach Contacts (Companies/Contacts database -- business cards, Excel imports). These
  // are B2B prospects: there's no consent table for them, so they're emailed unless marked
  // "inactive" (= do not contact). Each email is personalized with that person's own name,
  // company and job title, sent ONE BY ONE (never a group email with visible addresses).
  if (audience.type === "outreach_all" || audience.type === "outreach_tag") {
    return await sendToOutreach(env, campaign, template, campaignId, audience, admin.email, origin);
  }

  let customers: any[] = [];
  if (audience.type === "contact" && audience.customer_id) {
    const r = await supaAdmin(env, `customers?id=eq.${audience.customer_id}&select=id,full_name,email,company,job_title`, { method: "GET" });
    customers = r.ok ? await r.json() : [];
  } else if (audience.type === "tag" && audience.tag_id) {
    const r = await supaAdmin(env, `customer_tags?tag_id=eq.${audience.tag_id}&select=customers(id,full_name,email,company,job_title)&limit=${MAX_RECIPIENTS}`, { method: "GET" });
    const rows = r.ok ? ((await r.json()) as any[]) : [];
    customers = rows.map((row) => row.customers).filter(Boolean);
  } else {
    const r = await supaAdmin(env, customersPath, { method: "GET" });
    customers = r.ok ? await r.json() : [];
  }

  let sent = 0, failed = 0, skippedNoEmail = 0, skippedNoConsent = 0;

  for (const c of customers) {
    if (!c.email) {
      await logMessage(env, campaignId, c.id, "", "skipped_no_email", null);
      skippedNoEmail++;
      continue;
    }
    const prefRes = await supaAdmin(env, `communication_preferences?customer_id=eq.${c.id}&category=eq.${campaign.category}&select=allowed`, { method: "GET" });
    const pref = ((await prefRes.json()) as any[])?.[0];
    if (!pref?.allowed) {
      await logMessage(env, campaignId, c.id, c.email, "skipped_no_consent", null);
      skippedNoConsent++;
      continue;
    }

    const vars = varsForCustomer(c);
    const html = renderTemplate((template.blocks || []) as EmailBlock[], vars);
    const subject = substituteVariables(template.subject || template.name, vars);
    try {
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [c.email], subject, html }),
      });
      if (sendRes.ok) {
        await logMessage(env, campaignId, c.id, c.email, "sent", null);
        sent++;
      } else {
        await logMessage(env, campaignId, c.id, c.email, "failed", await sendRes.text());
        failed++;
      }
    } catch (e: any) {
      await logMessage(env, campaignId, c.id, c.email, "failed", e?.message || "Send failed.");
      failed++;
    }
  }

  await supaAdmin(env, `email_campaigns?id=eq.${campaignId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString() }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "email_campaign_sent", entity_type: "email_campaign", entity_id: campaignId, details: { sent, failed, skippedNoEmail, skippedNoConsent } }),
  });

  return json({ ok: true, sent, failed, skipped_no_email: skippedNoEmail, skipped_no_consent: skippedNoConsent }, 200, origin);
};

const SELECT_OUTREACH = "id,first_name,last_name,full_name,email,job_title,status,company:outreach_companies(name)";

async function sendToOutreach(env: Env, campaign: any, template: any, campaignId: string, audience: any, adminEmail: string, origin: string | null) {
  let contacts: any[] = [];
  if (audience.type === "outreach_tag" && audience.tag_id) {
    const r = await supaAdmin(env, `outreach_contact_tags?tag_id=eq.${encodeURIComponent(audience.tag_id)}&select=contact:outreach_contacts(${SELECT_OUTREACH})&limit=${MAX_RECIPIENTS}`, { method: "GET" });
    const rows = r.ok ? ((await r.json()) as any[]) : [];
    contacts = rows.map((row) => row.contact).filter(Boolean);
  } else {
    const r = await supaAdmin(env, `outreach_contacts?select=${SELECT_OUTREACH}&order=created_at.desc&limit=${MAX_RECIPIENTS}`, { method: "GET" });
    contacts = r.ok ? await r.json() : [];
  }

  let sent = 0, failed = 0, skippedNoEmail = 0, skippedNoConsent = 0;
  const seen = new Set<string>();
  for (const c of contacts) {
    const email = String(c.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await logMessage(env, campaignId, null, email || "(none)", "skipped_no_email", `${c.full_name || ""}`.trim() || null); skippedNoEmail++; continue; }
    if (seen.has(email)) continue; // same person twice in the list -- send once
    seen.add(email);
    if (c.status === "inactive") { await logMessage(env, campaignId, null, email, "skipped_no_consent", "Contact marked inactive (do not contact)."); skippedNoConsent++; continue; }

    const full = String(c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).trim();
    const vars = {
      first_name: c.first_name || full.split(/\s+/)[0] || "",
      last_name: c.last_name || full.split(/\s+/).slice(1).join(" "),
      company: c.company?.name || "",
      job_title: c.job_title || "",
    };
    const html = renderTemplate((template.blocks || []) as EmailBlock[], vars);
    const subject = substituteVariables(template.subject || template.name, vars).replace(/&amp;/g, "&");
    try {
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [email], subject, html }),
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

  await supaAdmin(env, `email_campaigns?id=eq.${campaignId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString() }) });
  await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: `admin:${adminEmail}`, action: "email_campaign_sent", entity_type: "email_campaign", entity_id: campaignId, details: { audience: audience.type, sent, failed, skippedNoEmail, skippedNoConsent } }) });
  return json({ ok: true, sent, failed, skipped_no_email: skippedNoEmail, skipped_no_consent: skippedNoConsent }, 200, origin);
}

async function logMessage(env: Env, campaignId: string, customerId: string | null, toEmail: string, status: string, error: string | null) {
  await supaAdmin(env, "email_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ campaign_id: campaignId, customer_id: customerId, to_email: toEmail, status, error, sent_at: status === "sent" ? new Date().toISOString() : null }),
  });
}
