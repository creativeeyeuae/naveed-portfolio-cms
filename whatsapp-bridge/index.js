// ─── Naveed WhatsApp Bridge ──────────────────────────────────────────────────
// Connects ONE real WhatsApp number (via QR code scan, right here in this
// terminal) to the bynaveedanjum.com CMS. Runs on your own server -- NOT on
// Cloudflare, which can't run a persistent WhatsApp connection.
//
// This talks to the CMS using the exact two endpoints that were already built
// and waiting for it (nothing on the CMS side had to change for this):
//   POST /api/whatsapp/webhook  -- push incoming messages + connection status
//   GET  /api/whatsapp/pending  -- pull outgoing messages queued by Naveed in the CMS
//
// IMPORTANT -- this uses an UNOFFICIAL WhatsApp protocol (Baileys), not Meta's
// official Business API. WhatsApp can detect and ban numbers connected this
// way, sometimes within days, with no guaranteed pattern. This was explained
// and explicitly accepted before this file was written. If this number ever
// gets flagged, nothing on bynaveedanjum.com breaks -- only real-time WhatsApp
// delivery stops; the on-site Live Chat and CMS keep working either way.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const qrcodeTerminal = require("qrcode-terminal");
const QRCodeLib = require("qrcode");

// Draw the QR using plain "#" / " " characters only -- no Unicode block glyphs.
// Some server/VNC console fonts can't render the Unicode half-block characters
// qrcode-terminal normally uses, and silently show garbled diamonds instead
// (unscannable). Plain ASCII renders correctly everywhere.
function printAsciiQr(qrData) {
  const code = QRCodeLib.create(qrData, { errorCorrectionLevel: "L" });
  const modules = code.modules; // square BitMatrix
  const size = modules.size;
  const border = 2;
  const lines = [];
  for (let y = -border; y < size + border; y++) {
    let line = "";
    for (let x = -border; x < size + border; x++) {
      const dark = y >= 0 && y < size && x >= 0 && x < size && modules.get(y, x);
      line += dark ? "##" : "  ";
    }
    lines.push(line);
  }
  console.log("\n" + lines.join("\n") + "\n");
}
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

const TARGET = (process.env.BRIDGE_TARGET_URL || "").replace(/\/+$/, "");
const SECRET = process.env.BRIDGE_SECRET || "";
const POLL_MS = Number(process.env.POLL_INTERVAL_MS || 4000);
const AUTH_DIR = path.join(__dirname, "auth_info_baileys");
// Optional: your WhatsApp number in international format, digits only (e.g. 9715XXXXXXXX).
// When set, the bridge prints an 8-character PAIRING CODE instead of a QR code --
// for server screens that can't draw a scannable QR.
const PAIR_PHONE = String(process.env.PAIR_PHONE || "").replace(/[^\d]/g, "");
// Set (by pollAndSend, see below) the moment this bridge itself calls sock.logout() in
// response to the CMS "Disconnect" button (migration 0018) -- distinguishes a deliberate,
// requested disconnect from WhatsApp unlinking/banning the number on its own. Both cases now
// auto-restart into a fresh QR (see the "close" handler and AUTO_RECOVER_LIMIT below) -- this
// flag just means the deliberate case recovers immediately and never counts against that
// limit, since it wasn't an unexpected failure.
let manualDisconnectRequested = false;
// Auto-recovery counter for a real WhatsApp-side logout (device_removed, ban, etc. -- NOT
// the manual Disconnect-button path above, which always recovers and never counts here).
// By explicit request: don't make Naveed VNC in and run commands by hand every time this
// happens -- clear the dead session and come straight back with a fresh QR in the CMS on
// its own. Capped at AUTO_RECOVER_LIMIT in a row so a real, persisting problem (e.g. WhatsApp
// actively banning this number, or something else still linked to it) stops retrying and
// waits for a human instead of hammering WhatsApp's servers with repeated fresh registrations.
// Resets to 0 on every successful "open" connection.
let autoRecoverCount = 0;
const AUTO_RECOVER_LIMIT = 3;
// The currently-running pollAndSend timer and socket, kept at module scope so a reconnect
// (start() calling itself again -- on a transient drop, a manual disconnect, or an
// auto-recovery) can clean up the PREVIOUS attempt's interval/socket before starting a new
// one. Without this, every reconnect left its old setInterval(pollAndSend, ...) running
// forever against a dead socket, plus that old socket's connection.update/messages.upsert
// listeners still attached -- on repeated harmless network blips this piled up multiple
// parallel pollers and sockets, which could easily look like the connection randomly
// "flapping" even though no single drop was actually a real problem.
let currentPollInterval = null;
let currentSock = null;
// Naveed's own number -- the bridge's self-chat ("Message yourself") is where Live Chat
// alerts land (see _shared/liveChatWhatsapp.ts). A message HE sends there is picked up
// below and relayed to the CMS as an "admin_reply_in" so it can answer a Live Chat visitor
// directly from WhatsApp. Must match ADMIN_WHATSAPP_NUMBER on the CMS side (same default).
const ADMIN_NUMBER = String(process.env.ADMIN_WHATSAPP_NUMBER || "971581174911").replace(/[^\d]/g, "");

if (!TARGET || !SECRET) {
  console.error("Missing BRIDGE_TARGET_URL or BRIDGE_SECRET. Copy .env.example to .env and fill both in, then run again.");
  process.exit(1);
}

const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

async function callWebhook(payload) {
  try {
    const res = await fetch(`${TARGET}/api/whatsapp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bridge-Secret": SECRET },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("webhook call failed:", payload.type, res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("webhook call error:", payload.type, e.message);
  }
}

function jidToPhone(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}
function phoneToJid(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  return `${digits}@s.whatsapp.net`;
}

async function start() {
  // Clean up whatever the PREVIOUS connection attempt left running before starting a new
  // one -- see currentPollInterval/currentSock above. This runs on every call to start(),
  // including the very first one (both are still null then, so these are no-ops).
  if (currentPollInterval) { clearInterval(currentPollInterval); currentPollInterval = null; }
  if (currentSock) {
    try { currentSock.ev.removeAllListeners(); } catch (e) { console.error("could not remove old socket listeners:", e.message); }
    try { currentSock.end?.(new Error("replaced by reconnect")); } catch (e) { console.error("could not close old socket:", e.message); }
    currentSock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // we handle QR ourselves below, for a clearer message
  });
  currentSock = sock;

  sock.ev.on("creds.update", saveCreds);
  let pairingRequested = false; // ask WhatsApp for a pairing code only once per connection attempt

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (PAIR_PHONE) {
        if (!pairingRequested && !sock.authState.creds.registered) {
          pairingRequested = true;
          try {
            const code = await sock.requestPairingCode(PAIR_PHONE);
            const pretty = code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
            console.log(`\n=== PAIRING CODE: ${pretty} ===`);
            console.log(`On the phone: WhatsApp > Linked Devices > Link a Device > "Link with phone number instead", then type this code.\n`);
          } catch (e) {
            console.error("pairing code request failed:", e.message);
          }
        }
      } else {
        console.log("\n=== Scan this QR code with the WhatsApp phone you're connecting (WhatsApp > Linked Devices > Link a Device) ===\n");
        printAsciiQr(qr);
      }
      await callWebhook({ type: "connection_update", status: "connecting", qr_code: qr });
    }

    if (connection === "open") {
      autoRecoverCount = 0; // a real, successful connection clears any past auto-recovery streak
      const phone = jidToPhone(sock.user?.id);
      console.log(`\n✅ Connected to WhatsApp as ${phone}. The CMS Live Chat / WhatsApp tab will now show "Connected".\n`);
      await callWebhook({ type: "connection_update", status: "connected", phone_number: phone });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      if (loggedOut) {
        if (manualDisconnectRequested) {
          // This logout was requested from the CMS, not WhatsApp revoking the link --
          // clear the stale session and go straight back into a fresh QR, no manual
          // terminal restart needed.
          manualDisconnectRequested = false;
          console.log("\n🔄 Disconnected as requested from the CMS. Clearing the old session and generating a new QR...\n");
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) { console.error("could not clear session folder:", e.message); }
          await callWebhook({ type: "connection_update", status: "connecting", error: null });
          setTimeout(start, 1000);
        } else if (autoRecoverCount < AUTO_RECOVER_LIMIT) {
          // An unexpected logout (WhatsApp-side, not the CMS button) -- auto-recover into a
          // fresh QR by default now, so this never needs a manual VNC/terminal visit. Counted
          // against AUTO_RECOVER_LIMIT so a problem that keeps causing this (e.g. something
          // else still linked to this number, or an actual ban) doesn't turn into an endless
          // retry loop hitting WhatsApp's servers -- see the else branch below for that case.
          autoRecoverCount++;
          console.log(`\n🔄 Logged out of WhatsApp (unlinked, or a session conflict) -- auto-recovering (attempt ${autoRecoverCount}/${AUTO_RECOVER_LIMIT}): clearing the old session and generating a new QR...\n`);
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) { console.error("could not clear session folder:", e.message); }
          await callWebhook({ type: "connection_update", status: "connecting", error: null });
          setTimeout(start, 3000);
        } else {
          console.log(`\n⚠️  Logged out of WhatsApp ${AUTO_RECOVER_LIMIT} times in a row -- stopping auto-recovery so this doesn't hammer WhatsApp's servers. This usually means something else is linked to this same number (another phone/WhatsApp Web/Desktop session), or the number has been banned. Check that, then restart this bridge (pm2 restart wa-bridge) for a fresh QR.\n`);
          await callWebhook({ type: "connection_update", status: "not_connected", error: `Logged out ${AUTO_RECOVER_LIMIT}x in a row -- stopped auto-recovering. Check for another linked device, then restart the bridge for a fresh QR.` });
        }
      } else {
        console.log("\nConnection dropped, reconnecting in 5s...\n");
        await callWebhook({ type: "connection_update", status: "error", error: "Connection dropped, reconnecting..." });
        setTimeout(start, 5000);
      }
    }
  });

  // ── Incoming WhatsApp messages → push into the CMS inbox ──────────────────
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;
      if (m.key.remoteJid?.endsWith("@g.us")) continue; // skip group chats for now -- 1:1 only

      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        (m.message.imageMessage ? "[Photo]" : m.message.videoMessage ? "[Video]" : m.message.audioMessage ? "[Voice message]" : m.message.documentMessage ? "[Document]" : "[Unsupported message type]");

      if (m.key.fromMe) {
        // Only the self-chat matters here (Naveed messaging himself) -- that's where Live
        // Chat alerts land, and a reply there starting with #<tag> answers that visitor
        // directly. Every other outgoing message (real WhatsApp replies to customers) is
        // already tracked via pollAndSend's status_update, so it's ignored here.
        if (ADMIN_NUMBER && jidToPhone(m.key.remoteJid) === ADMIN_NUMBER && text) {
          await callWebhook({ type: "admin_reply_in", body: text });
        }
        continue;
      }

      const from = jidToPhone(m.key.remoteJid);
      if (!from) continue;

      await callWebhook({
        type: "message_in",
        from,
        name: m.pushName || undefined,
        body: text,
        wa_message_id: m.key.id,
      });
    }
  });

  // ── Outgoing: poll the CMS for messages Naveed queued, then actually send them ──
  async function pollAndSend() {
    try {
      const res = await fetch(`${TARGET}/api/whatsapp/pending`, { headers: { "X-Bridge-Secret": SECRET } });
      if (!res.ok) return;
      const data = await res.json();

      // Manual disconnect requested from the CMS (migration 0018) -- act on it once, then
      // let the "close" handler above do the actual reconnect once logout() finishes.
      if (data.disconnect_requested && !manualDisconnectRequested) {
        manualDisconnectRequested = true;
        try { await sock.logout(); } catch (e) { console.error("logout error:", e.message); }
        return;
      }

      const { pending } = data;
      for (const row of pending || []) {
        const toPhone = row.whatsapp_conversations?.wa_phone;
        if (!toPhone || !row.body) continue;
        try {
          const sent = await sock.sendMessage(phoneToJid(toPhone), { text: row.body });
          await callWebhook({ type: "status_update", message_id: row.id, wa_message_id: sent?.key?.id, status: "sent" });
        } catch (e) {
          await callWebhook({ type: "status_update", message_id: row.id, status: "failed", error: e.message });
        }
      }
    } catch (e) {
      console.error("pending-poll error:", e.message);
    }
  }
  currentPollInterval = setInterval(pollAndSend, POLL_MS);
}

start().catch((e) => {
  console.error("Fatal bridge error:", e);
  process.exit(1);
});
