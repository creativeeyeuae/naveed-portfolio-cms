// /api/admin/email/send-one  (admin only)
//   POST { template_id, to: [{ email, name? }], subject? } -> sends the template to up to 25
//        recipients, one personalised email each (first_name etc. filled in), from EMAIL_FROM.
//   GET  -> the 100 most recent direct sends (for the CMS "Sent" folder), from audit_log.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { renderTemplate, substituteVariables, type EmailBlock } from "../../../_shared/emailRender";
import { resendPayload } from "../../../_shared/emailDeliver";

type Env = AdminEnv & { RESEND_API_KEY?: string; EMAIL_FROM?: string };
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const r = await supaAdmin(env, "audit_log?action=eq.email_sent_direct&select=id,created_at,details,entity_id&order=created_at.desc&limit=100", { method: "GET" });
  return json({ sent: r.ok ? await r.json() : [] }, 200, origin);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  if (!env.RESEND_API_KEY) return json({ error: "Email sending isn't set up yet." }, 503, origin);
  const body = (await request.json().catch(() => ({}))) as any;
  const to = (Array.isArray(body.to) ? body.to : []).map((x: any) => ({ email: String(x?.email || "").trim().toLowerCase(), name: String(x?.name || "").trim().slice(0, 120) }))
    .filter((x: any) => EMAIL_RE.test(x.email));
  const uniq = to.filter((x: any, i: number) => to.findIndex((y: any) => y.email === x.email) === i);
  if (!uniq.length) return json({ error: "Add at least one valid email address." }, 400, origin);
  if (uniq.length > 25) return json({ error: "Max 25 recipients at once — use a Campaign for bigger lists." }, 400, origin);
  if (!/^[0-9a-f-]{36}$/i.test(String(body.template_id || ""))) return json({ error: "Pick a template." }, 400, origin);

  const tRes = await supaAdmin(env, `email_templates?id=eq.${body.template_id}&select=*`, { method: "GET" });
  const template = tRes.ok ? ((await tRes.json()) as any[])?.[0] : null;
  if (!template) return json({ error: "Template not found." }, 404, origin);
  const subjTpl = String(body.subject || template.subject || template.name || "").slice(0, 200);

  const results: any[] = [];
  for (const r of uniq) {
    const parts = r.name.split(/\s+/).filter(Boolean);
    const vars = { first_name: parts[0] || "there", last_name: parts.slice(1).join(" "), company: "", job_title: "" };
    const html = renderTemplate((template.blocks || []) as EmailBlock[], vars);
    const subject = substituteVariables(subjTpl, vars);
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env as any, r.email, subject, html)) });
    const ok = res.ok;
    results.push({ email: r.email, ok, error: ok ? undefined : (await res.text()).slice(0, 200) });
    await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: `admin:${admin.email}`, action: "email_sent_direct", entity_type: "email_template", entity_id: template.id, details: { to_email: r.email, to_name: r.name, subject, template_name: template.name, ok } }) }).catch(() => {});
  }
  const sent = results.filter((x) => x.ok).length;
  return json({ ok: sent > 0, sent, failed: results.length - sent, results }, sent ? 200 : 502, origin);
};
