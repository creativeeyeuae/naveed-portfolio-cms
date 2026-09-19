// GET  /api/client/messages   -- the signed-in client's own message thread with Naveed
// POST /api/client/messages   body: { body: string } -- send a new message in that thread
//
// Backed by a new public.client_messages table (see database/migrations/0006_client_
// messages.sql -- additive, not yet run against production; see that file's header). RLS
// is enabled on it with ZERO policies, same as this project's other visitor-engagement
// tables -- every read/write goes through here or admin/messages.ts, both of which derive
// the customer_id server-side rather than trusting the browser.
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";
import { notifyAllAdmins, type PushEnv } from "../../_shared/webpush";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const customerId = await resolveOwnCustomerId(env, user);
  if (!customerId) return json({ messages: [] }, 200, origin);

  const res = await supaService(env, `client_messages?customer_id=eq.${customerId}&order=created_at.asc&limit=500`, {
    method: "GET",
  });
  if (!res.ok) return json({ error: "Could not load your messages.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  // Mark admin's messages as read now that the client has fetched the thread.
  const unread = rows.filter((m) => m.sender === "admin" && !m.is_read_by_client).map((m) => m.id);
  if (unread.length) {
    await supaService(env, `client_messages?id=in.(${unread.join(",")})`, {
      method: "PATCH",
      body: JSON.stringify({ is_read_by_client: true }),
    });
  }

  return json({ messages: rows }, 200, origin);
};

export const onRequestPost: PagesFunction<ClientEnv & PushEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400, origin);
  }
  const text = String(body?.body || "").trim();
  if (!text) return json({ error: "Message can't be empty." }, 400, origin);
  if (text.length > 4000) return json({ error: "Message is too long." }, 400, origin);

  let customerId = await resolveOwnCustomerId(env, user);
  if (!customerId) {
    // First-ever message from an account that has no booking/customer row yet -- create a
    // minimal one now, linked to their auth id from the start, so the thread has somewhere
    // to live. This never happens for anyone who has already booked (resolveOwnCustomerId
    // would have found or linked that row already).
    const createRes = await supaService(env, "customers", {
      method: "POST",
      body: JSON.stringify({ full_name: user.email, email: user.email, auth_user_id: user.id }),
    });
    if (!createRes.ok) return json({ error: "Could not start your message thread.", detail: await createRes.text() }, 500, origin);
    const created = (await createRes.json()) as any[];
    customerId = created?.[0]?.id || null;
  }
  if (!customerId) return json({ error: "Could not start your message thread." }, 500, origin);

  const insRes = await supaService(env, "client_messages", {
    method: "POST",
    body: JSON.stringify({ customer_id: customerId, sender: "client", sender_name: user.email, body: text, is_read_by_admin: false, is_read_by_client: true }),
  });
  if (!insRes.ok) return json({ error: "Could not send your message.", detail: await insRes.text() }, 500, origin);

  try {
    await notifyAllAdmins(env, { title: "New client message", body: `${user.email}: ${text.slice(0, 120)}`, url: "/?admin=1" });
  } catch {
    // Push is best-effort -- the message itself is already saved either way.
  }

  return json({ ok: true }, 200, origin);
};
