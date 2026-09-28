// POST /api/admin/whatsapp/conversations/:id/messages -- enqueue an outbound message.
// This ALWAYS inserts with status="queued" and NEVER contacts a WhatsApp server -- there is
// no real send in this phase. Once the VPS bridge is connected, it will poll
// api/whatsapp/pending.ts for rows exactly like the one this creates, actually send them,
// then report the real outcome back through api/whatsapp/webhook.ts.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body.body || "").trim();
  if (!text) return json({ error: "Message text is required." }, 400, origin);

  const convId = params.id as string;
  const res = await supaAdmin(env, "whatsapp_messages", {
    method: "POST",
    body: JSON.stringify({ conversation_id: convId, direction: "outbound", sender: `admin:${admin.email}`, body: text, status: "queued" }),
  });
  if (!res.ok) return json({ error: "Could not save message.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  await supaAdmin(env, `whatsapp_conversations?id=eq.${convId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_message_at: new Date().toISOString(), last_message_preview: text.slice(0, 140), updated_at: new Date().toISOString() }),
  });

  return json({ message: rows?.[0] }, 200, origin);
};
