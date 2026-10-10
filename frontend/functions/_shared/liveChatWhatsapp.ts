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
// WhatsApp needs the full international number with NO leading 0/00/+ -- e.g. 971501234567.
// Clients usually type local UAE formats ("050 123 4567", "0501234567", "501234567") which
// WhatsApp silently drops (no such account), so convert those before queuing. Numbers that
// already carry a country code are left as they are.
export function toWhatsAppNumber(raw: string | null | undefined, defaultCountry = "971"): string {
  let d = String(raw || "").trim().replace(/[^\d+]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) d = d.slice(1).replace(/\D/g, "");
  else {
    d = d.replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    else if (!d.startsWith(defaultCountry)) {
      if (d.startsWith("0") && d.length >= 9 && d.length <= 10) return defaultCountry + d.slice(1);
      if (d.length === 9 && /^[5]/.test(d)) return defaultCountry + d;
      return d;
    }
  }
  // d now starts with a country code: fix "971 00971...", "971 971...", "971 0..."
  for (const cc of [defaultCountry, "966", "92", "91", "63", "44", "1"]) {
    if (d.startsWith(cc + "00" + cc)) d = d.slice(cc.length + 2);
    if (d.startsWith(cc + cc) && d.length > cc.length + 8) d = d.slice(cc.length);
    if (d.startsWith(cc + "0") && d.length > cc.length + 8) d = cc + d.slice(cc.length + 1);
  }
  return d;
  // (legacy path below kept for reference; unreachable)
  d = d.replace(/\D/g, "");
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith(defaultCountry)) return d;
  if (d.startsWith("0") && d.length >= 9 && d.length <= 10) return defaultCountry + d.slice(1); // 050xxxxxxx / 04xxxxxxx
  if (d.length === 9 && /^[5]/.test(d)) return defaultCountry + d; // 50xxxxxxx
  return d;
}

async function queueWhatsAppAlert(env: any, toPhone: string, text: string, displayName?: string): Promise<string> {
  const phone = toWhatsAppNumber(toPhone);
  if (!phone || phone.length < 8) return "";
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
    if (!conversationId) return "";

    const msgRes = await supaAdmin(env, "whatsapp_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ conversation_id: conversationId, direction: "outbound", sender: "system", body: text, status: "queued" }),
    });
    return msgRes.ok ? phone : ""; // the exact number it was queued to (shown in the CMS)
  } catch {
    // Best-effort -- forwarding to WhatsApp never blocks whatever triggered it, which is
    // already saved/handled by the time this is called.
    return "";
  }
}

// Queue any alert text to Naveed's own WhatsApp, via the self-chat on the ONE connected
// bridge number. Used where Naveed needs to be able to REPLY straight from WhatsApp (the
// live-chat handover tag workflow below), since a reply only reaches this system when it's
// typed from the same account the bridge is logged into.
export async function forwardAdminWhatsAppAlert(env: any, text: string): Promise<void> {
  await queueWhatsAppAlert(env, adminWhatsAppNumber(env), text, "Site alerts");
}

// A second, RECEIVE-ONLY number for Naveed's own FYI alerts (new booking, new inquiry) --
// read from ADMIN_ALERTS_WHATSAPP_NUMBER, falling back to the number he asked these to go
// to. This is just a normal outbound message sent BY the one connected bridge number TO this
// number, same as any client message -- it does NOT need its own WhatsApp/bridge connection,
// no QR scan, no extra ban risk. Naveed can't reply to these from that number and have it do
// anything (unlike forwardAdminWhatsAppAlert above) -- by design, since he asked for these
// "only to receive alerts."
export function adminAlertsWhatsAppNumber(env: any): string {
  return String(env.ADMIN_ALERTS_WHATSAPP_NUMBER || "971554080875").replace(/[^\d]/g, "");
}

export async function forwardAdminAlertsWhatsApp(env: any, text: string): Promise<void> {
  await queueWhatsAppAlert(env, adminAlertsWhatsAppNumber(env), text, "Site alerts");
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
): Promise<string> {
  if (!clientPhone) return "";
  return await queueWhatsAppAlert(env, clientPhone, text, clientName); // "" = not queued
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
  // No code to type: Naveed just swipes right on this alert (WhatsApp "Reply") and types.
  // The bridge sends the quoted alert along, and the webhook reads the #tag from it.
  const full = `${text}\n\n↩️ To answer: swipe right on this message and type your reply. (ref #${tag})`;
  await forwardAdminWhatsAppAlert(env, full);
}
