// GET /api/admin/whatsapp/conversations -- list every conversation (newest activity first),
// embedded with its linked CRM customer if any. This phase never talks to a real WhatsApp
// server, so this list is empty until an admin creates a draft conversation below.
// POST /api/admin/whatsapp/conversations -- create a draft conversation (admin-initiated,
// e.g. to prep a thread for a known contact before WhatsApp is connected).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(
    env,
    "whatsapp_conversations?select=*,customers(id,full_name,email,phone)&order=last_message_at.desc.nullslast,created_at.desc&limit=300",
    { method: "GET" }
  );
  if (!res.ok) return json({ error: "Could not load conversations.", detail: await res.text() }, 500, origin);
  return json({ conversations: await res.json() }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { customer_id?: string; wa_phone?: string; wa_name?: string };
  const waPhone = (body.wa_phone || "").trim();
  if (!waPhone) return json({ error: "A WhatsApp phone number is required." }, 400, origin);

  const res = await supaAdmin(env, "whatsapp_conversations", {
    method: "POST",
    body: JSON.stringify({ customer_id: body.customer_id || null, wa_phone: waPhone, wa_name: body.wa_name || null }),
  });
  if (!res.ok) return json({ error: "Could not create conversation.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "whatsapp_conversation_created", entity_type: "whatsapp_conversation", entity_id: rows?.[0]?.id, details: { wa_phone: waPhone } }),
  });

  return json({ conversation: rows?.[0] }, 200, origin);
};
