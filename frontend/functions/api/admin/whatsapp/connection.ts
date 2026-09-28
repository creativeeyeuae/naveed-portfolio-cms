// GET /api/admin/whatsapp/connection -- the single connection-status row the CMS's
// Connection page reads. Seeded as 'not_connected' by migration 0010 and never changed by
// anything in this phase -- only the future bridge's webhook (api/whatsapp/webhook.ts,
// type:"connection_update") will ever move it out of 'not_connected'.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "whatsapp_connection?select=*&limit=1", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load connection status.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ connection: rows?.[0] || { status: "not_connected" } }, 200, origin);
};
