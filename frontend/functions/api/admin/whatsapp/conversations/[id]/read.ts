// POST /api/admin/whatsapp/conversations/:id/read -- mark a conversation as read (resets
// unread_count to 0), called when the admin opens it in the chat window.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, `whatsapp_conversations?id=eq.${params.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ unread_count: 0 }),
  });
  if (!res.ok) return json({ error: "Could not mark as read.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
