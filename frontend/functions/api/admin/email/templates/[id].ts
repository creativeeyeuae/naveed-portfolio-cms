// GET /api/admin/email/templates/:id -- one template.
// PATCH /api/admin/email/templates/:id -- update name/subject/blocks.
// DELETE /api/admin/email/templates/:id -- remove a template (blocked if a campaign uses it).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, `email_templates?id=eq.${params.id}&select=*`, { method: "GET" });
  const rows = (await res.json()) as any[];
  if (!rows?.[0]) return json({ error: "Template not found." }, 404, origin);
  return json({ template: rows[0] }, 200, origin);
};

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { name?: string; subject?: string; blocks?: unknown };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.subject === "string") patch.subject = body.subject;
  if (Array.isArray(body.blocks)) patch.blocks = body.blocks;

  const res = await supaAdmin(env, `email_templates?id=eq.${params.id}`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not save template.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ template: rows?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const usedRes = await supaAdmin(env, `email_campaigns?template_id=eq.${params.id}&select=id&limit=1`, { method: "GET" });
  const used = usedRes.ok ? ((await usedRes.json()) as any[]) : [];
  if (used?.[0]) return json({ error: "This template is used by a campaign and can't be deleted." }, 409, origin);

  const res = await supaAdmin(env, `email_templates?id=eq.${params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete template.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
