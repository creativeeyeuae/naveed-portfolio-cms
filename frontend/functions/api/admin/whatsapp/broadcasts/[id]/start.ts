// POST /api/admin/whatsapp/broadcasts/:id/start -- the real "send" action. A draft only
// becomes real queued messages here, one whatsapp_messages row per recipient, each with a
// staggered `send_after` so the bridge's existing outbound poll (functions/api/whatsapp/
// pending.ts) drips them out over minutes instead of firing all at once -- see migration
// 0019's header for why. Refuses to run twice on the same broadcast.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../../_shared/adminAuth";

// Randomized gap between each recipient, in seconds -- organic-looking pacing rather than a
// perfectly even drip, which itself can look automated.
const MIN_GAP_S = 15;
const MAX_GAP_S = 35;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const id = params.id as string;
  const bRes = await supaAdmin(env, `whatsapp_broadcasts?id=eq.${id}&select=*&limit=1`, { method: "GET" });
  if (!bRes.ok) return json({ error: "Could not load broadcast.", detail: await bRes.text() }, 500, origin);
  const broadcast = ((await bRes.json()) as any[])?.[0];
  if (!broadcast) return json({ error: "Broadcast not found." }, 404, origin);
  if (broadcast.status !== "draft") return json({ error: `This broadcast is already ${broadcast.status}.` }, 400, origin);

  const conversationIds: string[] = Array.isArray(broadcast.recipient_conversation_ids) ? broadcast.recipient_conversation_ids : [];
  if (conversationIds.length === 0) return json({ error: "This broadcast has no recipients." }, 400, origin);

  const now = Date.now();
  let offsetS = 0;
  const rows = conversationIds.map((conversationId) => {
    offsetS += MIN_GAP_S + Math.random() * (MAX_GAP_S - MIN_GAP_S);
    return {
      conversation_id: conversationId,
      direction: "outbound",
      sender: "system",
      body: broadcast.body,
      status: "queued",
      broadcast_id: id,
      send_after: new Date(now + offsetS * 1000).toISOString(),
    };
  });

  const insertRes = await supaAdmin(env, "whatsapp_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!insertRes.ok) return json({ error: "Could not queue broadcast messages.", detail: await insertRes.text() }, 500, origin);

  await supaAdmin(env, `whatsapp_broadcasts?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "sending", started_at: new Date().toISOString() }),
  });

  const etaMinutes = Math.ceil(offsetS / 60);
  return json({ ok: true, recipients: rows.length, eta_minutes: etaMinutes }, 200, origin);
};
