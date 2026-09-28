// GET /api/whatsapp/pending -- for the FUTURE VPS bridge only (never called by the CMS
// browser UI, never called by anything today). Returns outbound messages queued by admins
// that are waiting to actually be sent. Authenticated by a shared secret (X-Bridge-Secret),
// not an admin session -- see _shared/whatsappBridgeAuth.ts. Returns 503 until
// WHATSAPP_BRIDGE_SECRET is configured, which it isn't yet.
import { supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { requireBridge, type BridgeEnv } from "../../_shared/whatsappBridgeAuth";

type Env = BridgeEnv & AdminEnv;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const gate = await requireBridge(request, env);
  if (gate !== true) return gate;

  const res = await supaAdmin(
    env,
    "whatsapp_messages?status=eq.queued&direction=eq.outbound&select=*,whatsapp_conversations(wa_phone)&order=created_at.asc&limit=100",
    { method: "GET" }
  );
  if (!res.ok) return json({ error: "Could not load pending messages.", detail: await res.text() }, 500, origin);
  return json({ pending: await res.json() }, 200, origin);
};
