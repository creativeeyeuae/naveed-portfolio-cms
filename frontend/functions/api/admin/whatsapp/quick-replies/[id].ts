// PATCH /api/admin/whatsapp/quick-replies/:id -- update a saved canned response.
// DELETE /api/admin/whatsapp/quick-replies/:id -- remove one.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { title?: string; body?: string; category?: string };
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.body === "string") patch.body = body.body;
  if (typeof body.category === "string") patch.category = body.category;

  const res = await supaAdmin(env, `whatsapp_quick_replies?id=eq.${params.id}`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not save quick reply.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ quick_reply: rows?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, `whatsapp_quick_replies?id=eq.${params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete quick reply.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
