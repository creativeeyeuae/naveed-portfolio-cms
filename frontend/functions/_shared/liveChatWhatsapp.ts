// Forwards an on-site Live Chat message to Naveed's own WhatsApp number -- by queuing it
// through the EXACT same outbound pipeline the real WhatsApp CRM already uses: it writes a
// row into whatsapp_conversations/whatsapp_messages (migration 0010), and the bridge that's
// already running on the VPS (whatsapp-bridge/index.js's pollAndSend, polling every ~4s via
// GET /api/whatsapp/pending) picks it up and sends it with sock.sendMessage, same as any
// other outbound WhatsApp reply. No bridge changes needed at all.
//
// Naveed's own number is read from ADMIN_WHATSAPP_NUMBER (set it in the Cloudflare Pages
// project's env vars to change it without a code change); falls back to the number already
// connected in this project (971581174911) if that var isn't set.
import { supaAdmin } from "./adminAuth";

export async function forwardLiveChatToWhatsApp(env: any, text: string): Promise<void> {
  const toPhone = String(env.ADMIN_WHATSAPP_NUMBER || "971581174911").replace(/[^\d]/g, "");
  if (!toPhone) return;
  try {
    const existingRes = await supaAdmin(env, `whatsapp_conversations?wa_phone=eq.${toPhone}&select=id&limit=1`, { method: "GET" });
    let conversationId: string | undefined = ((await existingRes.json()) as any[])?.[0]?.id;

    if (!conversationId) {
      const createRes = await supaAdmin(env, "whatsapp_conversations", {
        method: "POST",
        body: JSON.stringify({ wa_phone: toPhone, wa_name: "Live Chat alerts", status: "open" }),
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
    // Best-effort -- forwarding to WhatsApp never blocks the Live Chat message itself,
    // which is already saved by the time this is called.
  }
}
