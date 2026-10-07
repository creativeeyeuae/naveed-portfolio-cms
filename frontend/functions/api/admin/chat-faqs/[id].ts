// PATCH /api/admin/chat-faqs/:id -- update a saved Q&A (question, answer, and/or is_active).
// DELETE /api/admin/chat-faqs/:id -- remove one.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { question?: string; answer?: string; is_active?: boolean; sort_order?: number };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.question === "string") patch.question = body.question;
  if (typeof body.answer === "string") patch.answer = body.answer;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.sort_order === "number") patch.sort_order = body.sort_order;

  const res = await supaAdmin(env, `chat_faqs?id=eq.${params.id}`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not save that Q&A.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ faq: rows?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, `chat_faqs?id=eq.${params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete that Q&A.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
