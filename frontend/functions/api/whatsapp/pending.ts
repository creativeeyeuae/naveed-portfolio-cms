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

  // send_after (migration 0019, for Broadcasts) lets a message sit queued but not yet
  // eligible to send -- null (every non-broadcast message, unaffected) or already-passed
  // times are both eligible; a future send_after is held back until its own poll cycle.
  const nowIso = new Date().toISOString();
  const res = await supaAdmin(
    env,
    `whatsapp_messages?status=eq.queued&direction=eq.outbound&or=(send_after.is.null,send_after.lte.${nowIso})&select=*,whatsapp_conversations(wa_phone)&order=created_at.asc&limit=100`,
    { method: "GET" }
  );
  if (!res.ok) return json({ error: "Could not load pending messages.", detail: await res.text() }, 500, origin);

  // Piggyback the manual disconnect flag (migration 0018) on this same poll the bridge
  // already makes every ~4s, instead of adding a second polling loop -- see
  // api/admin/whatsapp/disconnect.ts for where this gets set to true.
  // connect_requested (migration 0020) -- the CMS "Connect" button; an idle, unlinked
  // bridge only ever shows a QR after this is set.
  let disconnectRequested = false;
  let connectRequested = false;
  try {
    const connRes = await supaAdmin(env, "whatsapp_connection?select=disconnect_requested,connect_requested&limit=1", { method: "GET" });
    const c = ((await connRes.json()) as any[])?.[0];
    disconnectRequested = !!c?.disconnect_requested;
    connectRequested = !!c?.connect_requested;
  } catch {}

  return json({ pending: await res.json(), disconnect_requested: disconnectRequested, connect_requested: connectRequested }, 200, origin);
};
