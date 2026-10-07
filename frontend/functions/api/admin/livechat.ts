// GET  /api/admin/livechat            -- every visitor's live-chat messages (CMS groups into threads)
// POST /api/admin/livechat   body: { visitor_id, body } -- reply in one visitor's thread
// POST /api/admin/livechat   body: { visitor_id, ai_paused: true|false } -- take over / resume
//      the AI for that one visitor's thread (see visitors.ai_paused, migration 0015).
//      When true, api/visitor/chat.ts stops generating AI auto-replies for that visitor --
//      only Naveed's own replies land until he resumes it.
//
// Admin side of the on-site Live Chat widget (see api/visitor/chat.ts for the visitor
// side). Requires a real Supabase Auth admin session (see _shared/adminAuth.ts), same as
// every other admin-only endpoint -- the public anon key has no access to
// live_chat_messages at all.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  let res = await supaAdmin(
    env,
    `live_chat_messages?select=*,visitors(name,email,whatsapp,ai_paused)&order=created_at.desc&limit=1000`,
    { method: "GET" }
  );
  if (!res.ok) {
    // visitors.ai_paused (migration 0015) may not have been run yet in this environment --
    // never let that take down the whole Live Chat list. Retry without it; the Take Over /
    // Resume AI button simply won't reflect state until the migration runs.
    const detail = await res.text();
    if (!detail.includes("ai_paused")) return json({ error: "Could not load live chat.", detail }, 500, origin);
    res = await supaAdmin(env, `live_chat_messages?select=*,visitors(name,email,whatsapp)&order=created_at.desc&limit=1000`, { method: "GET" });
    if (!res.ok) return json({ error: "Could not load live chat.", detail: await res.text() }, 500, origin);
  }
  const rows = (await res.json()) as any[];
  return json({ messages: rows }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400, origin);
  }
  const visitorId = String(body?.visitor_id || "");
  if (!visitorId) return json({ error: "Missing recipient." }, 400, origin);

  // Take-over toggle: { visitor_id, ai_paused } with no `body` text just flips the flag --
  // doesn't send a chat message.
  if (typeof body?.ai_paused === "boolean") {
    const updRes = await supaAdmin(env, `visitors?id=eq.${visitorId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ai_paused: body.ai_paused }),
    });
    if (!updRes.ok) return json({ error: "Could not update takeover state.", detail: await updRes.text() }, 500, origin);
    return json({ ok: true }, 200, origin);
  }

  const text = String(body?.body || "").trim();
  if (!text) return json({ error: "Missing message." }, 400, origin);

  const insRes = await supaAdmin(env, "live_chat_messages", {
    method: "POST",
    body: JSON.stringify({
      visitor_id: visitorId,
      sender: "admin",
      body: text,
      is_read_by_admin: true,
      is_read_by_visitor: false,
    }),
  });
  if (!insRes.ok) return json({ error: "Could not send reply.", detail: await insRes.text() }, 500, origin);

  // Also mark every earlier VISITOR message in this thread as read, now that the admin has
  // seen and replied to it -- keeps the CMS's unread badge accurate without a separate click.
  await supaAdmin(env, `live_chat_messages?visitor_id=eq.${visitorId}&sender=eq.visitor&is_read_by_admin=eq.false`, {
    method: "PATCH",
    body: JSON.stringify({ is_read_by_admin: true }),
  });

  return json({ ok: true }, 200, origin);
};
