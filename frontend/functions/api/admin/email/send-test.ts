// POST /api/admin/email/send-test -- renders one template with sample/admin data and sends it
// to a single address via Resend (https://resend.com). Requires two Cloudflare Pages secrets
// that do not exist yet: RESEND_API_KEY (from a free Resend account) and EMAIL_FROM (a
// verified sender on a domain you've added to Resend, e.g. "Naveed Anjum <hello@bynaveedanjum.com>").
// Until those are set, this endpoint returns a clear "not configured" error rather than a
// confusing failure -- it never silently pretends to have sent anything.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { renderTemplate, substituteVariables, type EmailBlock } from "../../../_shared/emailRender";
import { resendPayload } from "../../../_shared/emailDeliver";

type Env = AdminEnv & { RESEND_API_KEY?: string; EMAIL_FROM?: string };

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return json({ error: "Email sending isn't set up yet -- RESEND_API_KEY and EMAIL_FROM need to be added as secrets first." }, 503, origin);
  }

  const body = (await request.json().catch(() => ({}))) as { template_id?: string; to_email?: string };
  const toEmail = (body.to_email || "").trim();
  if (!toEmail) return json({ error: "A recipient email is required." }, 400, origin);
  if (!body.template_id) return json({ error: "template_id is required." }, 400, origin);

  const tRes = await supaAdmin(env, `email_templates?id=eq.${body.template_id}&select=*`, { method: "GET" });
  const template = ((await tRes.json()) as any[])?.[0];
  if (!template) return json({ error: "Template not found." }, 404, origin);

  const sampleVars = { first_name: "Alex", last_name: "Sample", company: "Sample Co.", job_title: "Founder" };
  const html = renderTemplate((template.blocks || []) as EmailBlock[], sampleVars);
  const subject = `[TEST] ${substituteVariables(template.subject || template.name, sampleVars)}`;

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(resendPayload(env as any, toEmail, subject, html)),
  });
  if (!sendRes.ok) return json({ error: "Resend rejected the send.", detail: await sendRes.text() }, 502, origin);

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "email_test_sent", entity_type: "email_template", entity_id: body.template_id, details: { to_email: toEmail } }),
  });

  return json({ ok: true }, 200, origin);
};
