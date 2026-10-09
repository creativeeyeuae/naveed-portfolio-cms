// GET   /api/admin/livechat-offline            -- messages CreativeBot saved in quick-answer
//                                                  (offline) mode, newest first
// PATCH /api/admin/livechat-offline  {id, handled} -- mark one as handled / not handled
// Admin-only. The table (live_chat_offline_messages, migration 0021) is insert-only for the
// public, so only this server endpoint (service role) can read or update it.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const res = await supaAdmin(env, "live_chat_offline_messages?select=*&order=created_at.desc&limit=200", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load offline messages.", detail: await res.text() }, 500, origin);
  return json({ messages: await res.json() }, 200, origin);
};

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const body = (await request.json().catch(() => ({}))) as { id?: string; handled?: boolean };
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return json({ error: "Invalid id." }, 400, origin);
  const res = await supaAdmin(env, `live_chat_offline_messages?id=eq.${body.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ handled: !!body.handled }),
  });
  if (!res.ok) return json({ error: "Could not update.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
