// GET /api/admin/whatsapp/broadcasts -- list broadcasts, with live sent/failed/pending
// counts computed from whatsapp_messages (never a stored counter that could drift).
// POST /api/admin/whatsapp/broadcasts -- create a DRAFT only (no message is queued/sent
// yet). Starting it for real is a separate, explicit step: see [id]/start.ts.
//
// Safety cap: a broadcast can target at most MAX_RECIPIENTS existing conversations.
// Recipients must be existing whatsapp_conversations (people who've already exchanged a
// real message with Naveed) -- there is deliberately no way to broadcast to an arbitrary
// pasted phone number list from this endpoint.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

const MAX_RECIPIENTS = 250;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "whatsapp_broadcasts?select=*&order=created_at.desc&limit=100", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load broadcasts.", detail: await res.text() }, 500, origin);
  const broadcasts = (await res.json()) as any[];

  // N+1 is fine at this volume (a handful of broadcasts, not thousands) -- see file header.
  for (const b of broadcasts) {
    const msgRes = await supaAdmin(env, `whatsapp_messages?broadcast_id=eq.${b.id}&select=status`, { method: "GET" });
    const rows = msgRes.ok ? ((await msgRes.json()) as { status: string }[]) : [];
    b.sent_count = rows.filter((r) => r.status === "sent" || r.status === "delivered" || r.status === "read").length;
    b.failed_count = rows.filter((r) => r.status === "failed").length;
    b.pending_count = rows.filter((r) => r.status === "queued").length;
  }

  return json({ broadcasts }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, any>;
  const name = String(body.name || "").trim();
  const text = String(body.body || "").trim();
  const conversationIds = Array.isArray(body.conversationIds) ? [...new Set(body.conversationIds.map(String))] : [];

  if (!name) return json({ error: "Name is required." }, 400, origin);
  if (!text) return json({ error: "Message body is required." }, 400, origin);
  if (conversationIds.length === 0) return json({ error: "Pick at least one recipient." }, 400, origin);
  if (conversationIds.length > MAX_RECIPIENTS) {
    return json({ error: `A single broadcast can target at most ${MAX_RECIPIENTS} conversations -- split this into more than one broadcast.` }, 400, origin);
  }

  const res = await supaAdmin(env, "whatsapp_broadcasts", {
    method: "POST",
    body: JSON.stringify({
      name,
      body: text,
      recipient_conversation_ids: conversationIds,
      total_recipients: conversationIds.length,
      status: "draft",
    }),
  });
  if (!res.ok) return json({ error: "Could not create broadcast.", detail: await res.text() }, 500, origin);
  const row = ((await res.json()) as any[])?.[0];

  return json({ broadcast: row }, 200, origin);
};
