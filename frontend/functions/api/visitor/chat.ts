// GET  /api/visitor/chat   -- this browser's own live-chat thread (empty if never chatted)
// POST /api/visitor/chat   body: { body: string } -- send a message in that thread
//
// This is the on-site Live Chat widget's backend (FloatingWA in app/HomeClient.tsx) --
// the visitor stays on bynaveedanjum.com, nothing redirects to WhatsApp. Identity reuses
// the existing low-friction "visitor" session (no password; see _shared/visitorAuth.ts +
// api/visitor/identify.ts), already used for likes/comments, so anyone who has already
// identified themselves there is recognized here too with zero extra steps. Backed by the
// new public.live_chat_messages table (database/migrations/0013_live_chat.sql -- additive,
// not yet run against production; see that file's header).
import { supaAdmin, json, corsHeaders } from "../../_shared/adminAuth";
import { getVisitorIdFromRequest, type VisitorEnv } from "../../_shared/visitorAuth";
import { notifyAllAdmins, type PushEnv } from "../../_shared/webpush";

type Env = VisitorEnv & PushEnv & { SUPABASE_SERVICE_ROLE_KEY: string };
const MAX_LEN = 2000;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ messages: [] }, 200, origin);

  const res = await supaAdmin(env as any, `live_chat_messages?visitor_id=eq.${visitorId}&order=created_at.asc&limit=500`, {
    method: "GET",
  });
  if (!res.ok) return json({ messages: [] }, 200, origin);
  const rows = (await res.json()) as any[];

  // Mark admin's replies as read now that the visitor has fetched the thread.
  const unread = rows.filter((m) => m.sender === "admin" && !m.is_read_by_visitor).map((m) => m.id);
  if (unread.length) {
    await supaAdmin(env as any, `live_chat_messages?id=in.(${unread.join(",")})`, {
      method: "PATCH",
      body: JSON.stringify({ is_read_by_visitor: true }),
    });
  }

  return json({ messages: rows }, 200, origin);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ error: "Please share your name and WhatsApp number first.", needsIdentity: true }, 401, origin);

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body.body || "").trim();
  if (!text) return json({ error: "Message can't be empty." }, 400, origin);
  if (text.length > MAX_LEN) return json({ error: "Message is too long." }, 400, origin);

  const insRes = await supaAdmin(env as any, "live_chat_messages", {
    method: "POST",
    body: JSON.stringify({ visitor_id: visitorId, sender: "visitor", body: text, is_read_by_admin: false, is_read_by_visitor: true }),
  });
  if (!insRes.ok) return json({ error: "Could not send your message.", detail: await insRes.text() }, 500, origin);

  try {
    await notifyAllAdmins(env, { title: "New live chat message", body: text.slice(0, 120), url: "/?admin=1" });
  } catch {
    // Push is best-effort -- the message itself is already saved either way.
  }

  return json({ ok: true }, 200, origin);
};
