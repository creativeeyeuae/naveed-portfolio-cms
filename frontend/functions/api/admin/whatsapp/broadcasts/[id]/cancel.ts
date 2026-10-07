// POST /api/admin/whatsapp/broadcasts/:id/cancel -- stops a broadcast. Any recipient
// message that hasn't gone out yet (status still 'queued') is deleted outright, so the
// bridge's next poll simply won't find it -- never a partial/garbled send. Anything already
// sent stays sent; there's no unsending a real WhatsApp message.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const id = params.id as string;
  const bRes = await supaAdmin(env, `whatsapp_broadcasts?id=eq.${id}&select=status&limit=1`, { method: "GET" });
  if (!bRes.ok) return json({ error: "Could not load broadcast.", detail: await bRes.text() }, 500, origin);
  const broadcast = ((await bRes.json()) as any[])?.[0];
  if (!broadcast) return json({ error: "Broadcast not found." }, 404, origin);
  if (broadcast.status !== "draft" && broadcast.status !== "sending") {
    return json({ error: `This broadcast is already ${broadcast.status}.` }, 400, origin);
  }

  const delRes = await supaAdmin(env, `whatsapp_messages?broadcast_id=eq.${id}&status=eq.queued`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!delRes.ok) return json({ error: "Could not cancel remaining messages.", detail: await delRes.text() }, 500, origin);

  await supaAdmin(env, `whatsapp_broadcasts?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "cancelled", completed_at: new Date().toISOString() }),
  });

  return json({ ok: true }, 200, origin);
};
