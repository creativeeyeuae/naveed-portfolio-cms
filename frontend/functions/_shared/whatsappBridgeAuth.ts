// Auth for the two server-to-server endpoints (api/whatsapp/webhook.ts, api/whatsapp/pending.ts)
// that the future VPS WhatsApp bridge will call. Deliberately separate from _shared/adminAuth.ts
// (that one checks a logged-in admin's Supabase session; this one checks a shared secret sent by
// a machine, not a browser) -- keeping WhatsApp's server-to-server layer isolated from the CMS's
// admin-session layer, per the isolation requirement for this phase.
import { json } from "./adminAuth";

export type BridgeEnv = { WHATSAPP_BRIDGE_SECRET?: string };

// Returns `true` when the caller is the bridge; otherwise returns the Response to send back.
// 503 (not 401) when the secret isn't configured yet -- same "disclosed, not silently broken"
// pattern used for Resend in the Email Designer phase. Nothing calls this bridge yet, and no
// secret exists yet, so today every call here (there shouldn't be any) returns 503.
export async function requireBridge(request: Request, env: BridgeEnv): Promise<Response | true> {
  const origin = request.headers.get("Origin");
  if (!env.WHATSAPP_BRIDGE_SECRET) {
    return json({ error: "The WhatsApp bridge isn't set up yet -- WHATSAPP_BRIDGE_SECRET needs to be added as a secret first." }, 503, origin);
  }
  const provided = request.headers.get("X-Bridge-Secret");
  if (!provided || provided !== env.WHATSAPP_BRIDGE_SECRET) {
    return json({ error: "Unauthorized." }, 401, origin);
  }
  return true;
}
