// Forwards alerts to Naveed's own WhatsApp number -- by queuing them through the EXACT same
// outbound pipeline the real WhatsApp CRM already uses: writes a row into
// whatsapp_conversations/whatsapp_messages (migration 0010), and the bridge that's already
// running on the VPS (whatsapp-bridge/index.js's pollAndSend, polling every ~4s via GET
// /api/whatsapp/pending) picks it up and sends it with sock.sendMessage, same as any other
// outbound WhatsApp reply. No bridge changes needed for sending these.
//
// Naveed's own number is read from ADMIN_WHATSAPP_NUMBER (set it in the Cloudflare Pages
// project's env vars to change it without a code change); falls back to the number already
// connected in this project (971581174911) if that var isn't set.
import { supaAdmin } from "./adminAuth";

export function adminWhatsAppNumber(env: any): string {
  return String(env.ADMIN_WHATSAPP_NUMBER || "971581174911").replace(/[^\d]/g, "");
}

// Generic: queue any alert text to ANY WhatsApp number (admin or client) through the exact
// same outbound pipeline -- a row in whatsapp_conversations/whatsapp_messages that the VPS
// bridge's pollAndSend picks up and sends via the ONE connected number (971581174911). Both
// forwardAdminWhatsAppAlert (below) and forwardClientWhatsAppAlert just call this with a
// different destination phone -- no second WhatsApp number/bridge involved.
async function queueWhatsAppAlert(env: any, toPhone: string, text: string, displayName?: string): Promise<void> {
  const phone = String(toPhone || "").replace(/[^\d]/g, "");
  if (!phone) return;
  try {
    const existingRes = await supaAdmin(env, `whatsapp_conversations?wa_phone=eq.${phone}&select=id&limit=1`, { method: "GET" });
    let conversationId: string | undefined = ((await existingRes.json()) as any[])?.[0]?.id;

    if (!conversationId) {
      const createRes = await supaAdmin(env, "whatsapp_conversations", {
        method: "POST",
        body: JSON.stringify({ wa_phone: phone, wa_name: displayName || "Site alerts", status: "open" }),
      });
      conversationId = ((await createRes.json()) as any[])?.[0]?.id;
    }
    if (!conversationId) return;

    await supaAdmin(env, "whatsapp_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ conversation_id: conversationId, direction: "outbound", sender: "system", body: text, status: "queued" }),
    });
  } catch {
    // Best-effort -- forwarding to WhatsApp never blocks whatever triggered it, which is
    // already saved/handled by the time this is called.
  }
}

// Queue any alert text to Naveed's own WhatsApp. Used directly for things that don't need a
// reply-back path (e.g. booking alerts), and internally by forwardLiveChatToWhatsApp below.
export async function forwardAdminWhatsAppAlert(env: any, text: string): Promise<void> {
  await queueWhatsAppAlert(env, adminWhatsAppNumber(env), text, "Site alerts");
}

// Queue a message to a CLIENT's own WhatsApp number (not Naveed's) -- same number/bridge,
// just a different destination. Used when an admin action on a booking/payment (confirm,
// reject, cancel, reschedule, complete) should let that client know automatically. Silently
// does nothing if the client has no WhatsApp/phone on file, so it can never block the admin
// action that triggered it.
export async function forwardClientWhatsAppAlert(
  env: any,
  clientPhone: string | undefined | null,
  text: string,
  clientName?: string
): Promise<void> {
  if (!clientPhone) return;
  await queueWhatsAppAlert(env, clientPhone, text, clientName);
}

// Short, stable tag for a visitor -- included in the WhatsApp alert so Naveed can reply
// straight from WhatsApp (start the reply with this tag) and have it land back in that
// visitor's Live Chat thread. See whatsapp-bridge/index.js's self-chat handling and
// api/whatsapp/webhook.ts's handleAdminReplyIn().
export function visitorWhatsAppTag(visitorId: string): string {
  return visitorId.replace(/-/g, "").slice(0, 6);
}

export async function forwardLiveChatToWhatsApp(env: any, visitorId: string, text: string): Promise<void> {
  const tag = visitorWhatsAppTag(visitorId);
  const full = `${text}\n\n(Reply here starting with #${tag} to answer this visitor directly from WhatsApp.)`;
  await forwardAdminWhatsAppAlert(env, full.replace(/^(💬[^\n]*)/, `$1 [#${tag}]`));
}
