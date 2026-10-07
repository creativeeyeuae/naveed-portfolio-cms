// POST /api/whatsapp/webhook -- for the FUTURE VPS bridge only (never called by the CMS
// browser UI, never called by anything today -- see _shared/whatsappBridgeAuth.ts). Returns
// 503 until WHATSAPP_BRIDGE_SECRET is configured, which it isn't yet. Nothing on the VPS has
// been installed and no real WhatsApp server exists yet -- this endpoint just defines the
// shape the future bridge will POST into, so the UI already built against it never has to
// change when that bridge is finally connected.
//
// Body shapes (one of):
//   {type:"message_in", from, name?, body?, media_url?, media_type?, wa_message_id?}
//     -- an inbound WhatsApp message. Naveed's WhatsApp number is also his normal personal/
//     business number, so this is NOT a blanket import: only a sender phone that matches an
//     existing Live Chat visitor's visitors.whatsapp is routed into that visitor's
//     live_chat_messages thread. Anything else is left in WhatsApp only -- no CMS record, no
//     visitor ever auto-created. See handleMessageIn/findVisitorByWhatsApp below.
//   {type:"status_update", message_id?, wa_message_id?, status, error?}
//     -- a delivery-status callback for a message this CMS previously queued. Pass message_id
//     (the whatsapp_messages row id, from GET /api/whatsapp/pending) the first time, right after
//     actually sending it, together with the real wa_message_id so it gets recorded -- after
//     that, later receipts (delivered/read) match by wa_message_id alone.
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
  if (body.type === "admin_reply_in") return handleAdminReplyIn(env, body, origin);
  return json({ error: "Unknown or missing 'type'." }, 400, origin);
};

// Naveed replied from WhatsApp itself (in the self-chat the bridge uses for Live Chat
// alerts -- see whatsapp-bridge/index.js's messages.upsert handler) instead of opening the
// CMS. The reply must start with the short #tag that forwardLiveChatToWhatsApp (see
// _shared/liveChatWhatsapp.ts) put in the original alert -- strip it off, find the matching
// visitor by that tag, and post the rest as a normal admin reply in that Live Chat thread,
// exactly like functions/api/admin/livechat.ts's POST does.
async function handleAdminReplyIn(env: Env, body: Record<string, any>, origin: string | null) {
  const raw = String(body.body || "").trim();
  const match = raw.match(/^#?([a-f0-9]{6})\b[\s:,-]*([\s\S]*)$/i);
  if (!match) return json({ ok: true, ignored: "no tag" }, 200, origin); // not a tagged reply -- nothing to do

  const [, tag, replyText] = match;
  if (!replyText.trim()) return json({ ok: true, ignored: "empty reply" }, 200, origin);

  // Visitor ids are UUIDs; the tag is the first 6 hex chars with dashes stripped. The table
  // is small (every past/present Live Chat visitor), so matching the tag in application code
  // is simplest and needs no schema change.
  const visRes = await supaAdmin(env, "visitors?select=id&order=created_at.desc&limit=2000", { method: "GET" });
  if (!visRes.ok) return json({ error: "Could not look up visitors.", detail: await visRes.text() }, 500, origin);
  const visitors = (await visRes.json()) as { id: string }[];
  const visitor = visitors.find((v) => v.id.replace(/-/g, "").slice(0, 6).toLowerCase() === tag.toLowerCase());
  if (!visitor) return json({ ok: true, ignored: "tag not found" }, 200, origin);

  await supaAdmin(env, "live_chat_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      visitor_id: visitor.id,
      sender: "admin",
      body: replyText.trim(),
      is_read_by_admin: true,
      is_read_by_visitor: false,
    }),
  });
  await supaAdmin(env, `live_chat_messages?visitor_id=eq.${visitor.id}&sender=eq.visitor&is_read_by_admin=eq.false`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_read_by_admin: true }),
  });

  return json({ ok: true, visitor_id: visitor.id }, 200, origin);
}

// Naveed's WhatsApp number is also his normal personal/business number -- it is NOT a
// dedicated "website inbox". So an inbound message here must NEVER be assumed to be about the
// website. Only messages from a phone number that matches an existing Live Chat visitor's own
// visitors.whatsapp are allowed to touch the CMS at all (routed straight into that visitor's
// live_chat_messages thread, same as a tagged admin_reply_in reply). Everything else --
// Naveed's ordinary contacts, family, other businesses -- is left alone in WhatsApp: no
// whatsapp_conversations row, no whatsapp_messages row, no visitor is ever auto-created from
// it. This intentionally narrows the general WhatsApp CRM inbox (whatsapp_conversations /
// whatsapp_messages) built in an earlier session: it will no longer receive new conversations
// from contacts unrelated to the website Live Chat, by explicit request.
async function findVisitorByWhatsApp(env: Env, fromPhone: string): Promise<{ id: string } | null> {
  const digits = fromPhone.replace(/[^\d]/g, "");
  if (!digits) return null;
  try {
    const res = await supaAdmin(env, "visitors?select=id,whatsapp&order=created_at.desc&limit=2000", { method: "GET" });
    if (!res.ok) return null;
    const rows = (await res.json()) as { id: string; whatsapp?: string }[];
    const match = rows.find((v) => v.whatsapp && v.whatsapp.replace(/[^\d]/g, "") === digits);
    return match ? { id: match.id } : null;
  } catch {
    return null; // fail safe: never guess, never import, on any lookup error
  }
}

async function handleMessageIn(env: Env, body: Record<string, any>, origin: string | null) {
  const from = String(body.from || "").trim();
  if (!from) return json({ error: "'from' is required." }, 400, origin);

  const visitor = await findVisitorByWhatsApp(env, from);
  if (!visitor) {
    // No matching Live Chat visitor -- this is a normal/direct WhatsApp chat, not a website
    // conversation. Leave it in WhatsApp only; do nothing in the CMS.
    return json({ ok: true, routed: false }, 200, origin);
  }

  const preview = String(body.body || "").slice(0, 2000);
  await supaAdmin(env, "live_chat_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      visitor_id: visitor.id,
      sender: "visitor",
      body: preview || (body.media_url ? "[Media message]" : ""),
      is_read_by_admin: false,
      is_read_by_visitor: true,
    }),
  });

  return json({ ok: true, routed: true, visitor_id: visitor.id }, 200, origin);
}

async function handleStatusUpdate(env: Env, body: Record<string, any>, origin: string | null) {
  // Two ways to identify the row being updated:
  //   - message_id: the whatsapp_messages row's own id. Used the FIRST time the bridge reports
  //     on a message it just sent (a queued outbound row never has wa_message_id set yet, so
  //     matching by wa_message_id alone can't find it) -- also lets us record the real WhatsApp
  //     message id at the same time, for every later receipt (delivered/read) to match against.
  //   - wa_message_id: the real WhatsApp message id. Used for every later delivery/read receipt,
  //     same as before this change -- existing callers are unaffected.
  if (!body.message_id && !body.wa_message_id) return json({ error: "'message_id' or 'wa_message_id' is required." }, 400, origin);

  const patch: Record<string, any> = { status: body.status || "failed", error: body.error || null };
  let filter: string;
  if (body.message_id) {
    filter = `id=eq.${encodeURIComponent(body.message_id)}`;
    if (body.wa_message_id) patch.wa_message_id = body.wa_message_id;
  } else {
    filter = `wa_message_id=eq.${encodeURIComponent(body.wa_message_id)}`;
  }

  const res = await supaAdmin(env, `whatsapp_messages?${filter}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return json({ error: "Could not update message status.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
}

async function handleConnectionUpdate(env: Env, body: Record<string, any>, origin: string | null) {
  const rowRes = await supaAdmin(env, "whatsapp_connection?select=id&limit=1", { method: "GET" });
  const row = ((await rowRes.json()) as any[])?.[0];
  // Always clear disconnect_requested on any connection_update -- by the time the bridge
  // reports back in (whether it's the "connecting" right after a manual disconnect, or any
  // other status), it has already acted on the request, so the flag's job is done. This is
  // the only place that clears it, keeping api/admin/whatsapp/disconnect.ts as the only place
  // that sets it.
  const patch = { status: body.status || "error", phone_number: body.phone_number || null, qr_code: body.qr_code || null, error: body.error || null, disconnect_requested: false, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!row) {
    await supaAdmin(env, "whatsapp_connection", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  } else {
    await supaAdmin(env, `whatsapp_connection?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  }
  return json({ ok: true }, 200, origin);
}
