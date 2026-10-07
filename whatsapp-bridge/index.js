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
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // we handle QR ourselves below, for a clearer message
  });

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
      const phone = jidToPhone(sock.user?.id);
      console.log(`\n✅ Connected to WhatsApp as ${phone}. The CMS Live Chat / WhatsApp tab will now show "Connected".\n`);
      await callWebhook({ type: "connection_update", status: "connected", phone_number: phone });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      if (loggedOut) {
        console.log("\n⚠️  Logged out of WhatsApp (unlinked from the phone, or banned). A fresh QR scan is needed to reconnect.\n");
        await callWebhook({ type: "connection_update", status: "not_connected", error: "Logged out -- needs a fresh QR scan." });
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
      if (!m.message || m.key.fromMe) continue; // ignore our own sent messages here
      const from = jidToPhone(m.key.remoteJid);
      if (!from || m.key.remoteJid?.endsWith("@g.us")) continue; // skip group chats for now -- 1:1 only
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        (m.message.imageMessage ? "[Photo]" : m.message.videoMessage ? "[Video]" : m.message.audioMessage ? "[Voice message]" : m.message.documentMessage ? "[Document]" : "[Unsupported message type]");

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
      const { pending } = await res.json();
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
  setInterval(pollAndSend, POLL_MS);
}

start().catch((e) => {
  console.error("Fatal bridge error:", e);
  process.exit(1);
});
