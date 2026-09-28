// GET /api/admin/whatsapp/conversations/:id -- one conversation, its linked customer, and
// its full message history (oldest first).
// PATCH /api/admin/whatsapp/conversations/:id -- update assigned_to and/or status.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const cRes = await supaAdmin(env, `whatsapp_conversations?id=eq.${params.id}&select=*,customers(id,full_name,email,phone,company)`, { method: "GET" });
  const conversation = ((await cRes.json()) as any[])?.[0];
  if (!conversation) return json({ error: "Conversation not found." }, 404, origin);

  // Tags fetched separately (same pattern as clients.ts) -- a 2-level nested embed through
  // customer_tags is not something we've relied on elsewhere, so this stays consistent and safe.
  if (conversation.customers?.id) {
    const tagRes = await supaAdmin(env, `customer_tags?customer_id=eq.${conversation.customers.id}&select=crm_tags(id,name,color)`, { method: "GET" });
    const tagLinks = tagRes.ok ? ((await tagRes.json()) as any[]) : [];
    conversation.customers.tags = tagLinks.map((t) => t.crm_tags).filter(Boolean);
  }

  const mRes = await supaAdmin(env, `whatsapp_messages?conversation_id=eq.${params.id}&select=*&order=created_at.asc&limit=1000`, { method: "GET" });
  const messages = mRes.ok ? await mRes.json() : [];

  return json({ conversation, messages }, 200, origin);
};

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { assigned_to?: string | null; status?: string };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("assigned_to" in body) patch.assigned_to = body.assigned_to || null;
  if (typeof body.status === "string") patch.status = body.status;

  const res = await supaAdmin(env, `whatsapp_conversations?id=eq.${params.id}`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not update conversation.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ conversation: rows?.[0] }, 200, origin);
};
