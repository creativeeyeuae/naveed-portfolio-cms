// GET /api/admin/email/templates -- list every saved email template (newest first).
// POST /api/admin/email/templates -- create a new template (name, subject, blocks[]).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "email_templates?select=*&order=updated_at.desc&limit=200", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load templates.", detail: await res.text() }, 500, origin);
  return json({ templates: await res.json() }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { name?: string; subject?: string; blocks?: unknown };
  const name = (body.name || "").trim();
  if (!name) return json({ error: "Template name is required." }, 400, origin);

  const res = await supaAdmin(env, "email_templates", {
    method: "POST",
    body: JSON.stringify({ name, subject: body.subject || "", blocks: Array.isArray(body.blocks) ? body.blocks : [], created_by: admin.email }),
  });
  if (!res.ok) return json({ error: "Could not create template.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ template: rows?.[0] }, 200, origin);
};
