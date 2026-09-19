// GET  /api/admin/messages            -- every client's messages (CMS groups into threads)
// POST /api/admin/messages   body: { customer_id, body } -- reply in one client's thread
//
// Requires a real Supabase Auth admin session (see _shared/adminAuth.ts), same as every
// other admin-only endpoint -- the public anon key has no access to client_messages at all.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(
    env,
    `client_messages?select=*,customers(full_name,email,phone)&order=created_at.desc&limit=1000`,
    { method: "GET" }
  );
  if (!res.ok) return json({ error: "Could not load messages.", detail: await res.text() }, 500, origin);
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
  const customerId = String(body?.customer_id || "");
  const text = String(body?.body || "").trim();
  if (!customerId || !text) return json({ error: "Missing recipient or message." }, 400, origin);

  const insRes = await supaAdmin(env, "client_messages", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      sender: "admin",
      sender_name: admin.email,
      body: text,
      is_read_by_admin: true,
      is_read_by_client: false,
    }),
  });
  if (!insRes.ok) return json({ error: "Could not send reply.", detail: await insRes.text() }, 500, origin);

  // Also mark every earlier CLIENT message in this thread as read, now that the admin has
  // seen and replied to it -- keeps the CMS's unread badge accurate without a separate click.
  await supaAdmin(env, `client_messages?customer_id=eq.${customerId}&sender=eq.client&is_read_by_admin=eq.false`, {
    method: "PATCH",
    body: JSON.stringify({ is_read_by_admin: true }),
  });

  return json({ ok: true }, 200, origin);
};
