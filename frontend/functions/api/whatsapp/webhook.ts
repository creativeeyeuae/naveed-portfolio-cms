// POST /api/whatsapp/webhook -- for the FUTURE VPS bridge only (never called by the CMS
// browser UI, never called by anything today -- see _shared/whatsappBridgeAuth.ts). Returns
// 503 until WHATSAPP_BRIDGE_SECRET is configured, which it isn't yet. Nothing on the VPS has
// been installed and no real WhatsApp server exists yet -- this endpoint just defines the
// shape the future bridge will POST into, so the UI already built against it never has to
// change when that bridge is finally connected.
//
// Body shapes (one of):
//   {type:"message_in", from, name?, body?, media_url?, media_type?, wa_message_id?}
//     -- an inbound WhatsApp message. Upserts the conversation by phone number and inserts
//     one inbound whatsapp_messages row.
//   {type:"status_update", wa_message_id, status, error?}
//     -- a delivery-status callback for a message this CMS previously queued.
//   {type:"connection_update", status, phone_number?, qr_code?, error?}
//     -- the bridge reporting its own connection state (e.g. showing a fresh QR code, or
//     confirming it's connected) so the CMS's Connection page can display it.
import { supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { requireBridge, type BridgeEnv } from "../../_shared/whatsappBridgeAuth";

type Env = BridgeEnv & AdminEnv;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const gate = await requireBridge(request, env);
  if (gate !== true) return gate;

  const body = (await request.json().catch(() => ({}))) as Record<string, any>;

  if (body.type === "message_in") return handleMessageIn(env, body, origin);
  if (body.type === "status_update") return handleStatusUpdate(env, body, origin);
  if (body.type === "connection_update") return handleConnectionUpdate(env, body, origin);
  return json({ error: "Unknown or missing 'type'." }, 400, origin);
};

async function handleMessageIn(env: Env, body: Record<string, any>, origin: string | null) {
  const from = String(body.from || "").trim();
  if (!from) return json({ error: "'from' is required." }, 400, origin);

  const existingRes = await supaAdmin(env, `whatsapp_conversations?wa_phone=eq.${encodeURIComponent(from)}&select=id&limit=1`, { method: "GET" });
  const existing = ((await existingRes.json()) as any[])?.[0];
  const preview = String(body.body || "").slice(0, 140);
  let conversationId = existing?.id as string | undefined;

  if (conversationId) {
    await supaAdmin(env, `whatsapp_conversations?id=eq.${conversationId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ wa_name: body.name || undefined, last_message_at: new Date().toISOString(), last_message_preview: preview, updated_at: new Date().toISOString() }),
    });
    // unread_count += 1 via a raw increment isn't expressible through this REST layer without
    // reading first, so read-then-write here (fine at this volume; no real traffic exists yet).
    const curRes = await supaAdmin(env, `whatsapp_conversations?id=eq.${conversationId}&select=unread_count`, { method: "GET" });
    const cur = ((await curRes.json()) as any[])?.[0]?.unread_count ?? 0;
    await supaAdmin(env, `whatsapp_conversations?id=eq.${conversationId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ unread_count: cur + 1 }) });
  } else {
    const createRes = await supaAdmin(env, "whatsapp_conversations", {
      method: "POST",
      body: JSON.stringify({ wa_phone: from, wa_name: body.name || null, last_message_at: new Date().toISOString(), last_message_preview: preview, unread_count: 1 }),
    });
    const created = ((await createRes.json()) as any[])?.[0];
    conversationId = created?.id;
  }

  await supaAdmin(env, "whatsapp_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      conversation_id: conversationId,
      direction: "inbound",
      sender: "customer",
      body: body.body || null,
      media_url: body.media_url || null,
      media_type: body.media_type || null,
      status: "delivered",
      wa_message_id: body.wa_message_id || null,
    }),
  });

  return json({ ok: true, conversation_id: conversationId }, 200, origin);
}

async function handleStatusUpdate(env: Env, body: Record<string, any>, origin: string | null) {
  if (!body.wa_message_id) return json({ error: "'wa_message_id' is required." }, 400, origin);
  const res = await supaAdmin(env, `whatsapp_messages?wa_message_id=eq.${encodeURIComponent(body.wa_message_id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: body.status || "failed", error: body.error || null }),
  });
  if (!res.ok) return json({ error: "Could not update message status.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
}

async function handleConnectionUpdate(env: Env, body: Record<string, any>, origin: string | null) {
  const rowRes = await supaAdmin(env, "whatsapp_connection?select=id&limit=1", { method: "GET" });
  const row = ((await rowRes.json()) as any[])?.[0];
  const patch = { status: body.status || "error", phone_number: body.phone_number || null, qr_code: body.qr_code || null, error: body.error || null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!row) {
    await supaAdmin(env, "whatsapp_connection", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  } else {
    await supaAdmin(env, `whatsapp_connection?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  }
  return json({ ok: true }, 200, origin);
}
