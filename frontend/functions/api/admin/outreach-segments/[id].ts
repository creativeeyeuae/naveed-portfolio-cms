// PATCH/DELETE /api/admin/outreach-segments/:id
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") fields.name = body.name.trim();
  if (body.filters && typeof body.filters === "object") fields.filters = body.filters;

  const res = await supaAdmin(env, `outreach_segments?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(fields) });
  if (!res.ok) return json({ error: "Could not update segment.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ segment: rows?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const res = await supaAdmin(env, `outreach_segments?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete segment.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
