// â”€â”€â”€ Naveed WhatsApp Bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

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

const TARGET = (process.env.BRIDGE_TARGET_URL || "").replace(/\/+$/, "");
const SECRET = process.env.BRIDGE_SECRET || "";
const AUTH_DIR = path.join(__dirname, "auth_info_baileys");
// Optional: your WhatsApp number in international format, digits only (e.g. 9715XXXXXXXX).
// When set, the bridge prints an 8-character PAIRING CODE instead of a QR code.
const PAIR_PHONE = String(process.env.PAIR_PHONE || "").replace(/[^\d]/g, "");
// Naveed's own number -- the self-chat where Live Chat alerts land; a reply he types there
// is relayed to the CMS as "admin_reply_in". Must match ADMIN_WHATSAPP_NUMBER on the CMS.
const ADMIN_NUMBER = String(process.env.ADMIN_WHATSAPP_NUMBER || "971581174911").replace(/[^\d]/g, "");

// â”€â”€ HOW THIS BRIDGE BEHAVES (Naveed's rule) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. Connect ONCE (scan the QR one time). After that it stays connected, including after a
//    server restart -- the saved session is reused, no new QR.
// 2. A short network drop reconnects on its own with the SAME session -- no QR, no scan.
// 3. If WhatsApp logs it out (or you press Disconnect in the CMS), it does NOT make a new
//    QR by itself. It goes quiet and waits until you press "Connect (show QR)" in the CMS.
// 4. A QR that isn't scanned within 3 minutes is abandoned -- press Connect again.
//
// Cloudflare free plan = 100,000 requests/day for the whole site, so requests are capped:
//   connected: check for outgoing messages every 15s  (â‰ˆ5,800/day)
//   waiting  : check for the Connect button once a minute (â‰ˆ1,440/day)
// Any error from the site pauses checking (5 min) instead of retrying non-stop.
const SEND_POLL_MS = Math.max(15000, Number(process.env.POLL_INTERVAL_MS || 15000));
const IDLE_POLL_MS = 60000;
const QR_TIMEOUT_MS = 3 * 60 * 1000;
const RECONNECT_DELAY_MS = 10000;

let currentSock = null;
let sendTimer = null;
let idleTimer = null;
let qrTimer = null;
let reconnectTimer = null;
let qrStartedAt = 0; // when the current QR attempt began (0 = not in the QR stage)
let manualDisconnectRequested = false;
let pollPausedUntil = 0;
let pollInFlight = false;

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

// One shared, rate-limited call to GET /api/whatsapp/pending. Returns the JSON, or null.
async function fetchPending() {
  if (pollInFlight || Date.now() < pollPausedUntil) return null;
  pollInFlight = true;
  try {
    const res = await fetch(`${TARGET}/api/whatsapp/pending`, { headers: { "X-Bridge-Secret": SECRET } });
    if (!res.ok) {
      console.error(`site answered HTTP ${res.status} -- pausing checks for 5 minutes`);
      pollPausedUntil = Date.now() + 5 * 60 * 1000;
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("could not reach the site:", e.message, "-- pausing checks for 1 minute");
    pollPausedUntil = Date.now() + 60 * 1000;
    return null;
  } finally {
    pollInFlight = false;
  }
}

function jidToPhone(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}
function phoneToJid(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  return `${digits}@s.whatsapp.net`;
}
function hasSavedSession() {
  try {
    const creds = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, "creds.json"), "utf8"));
    return !!(creds && creds.me);
  } catch { return false; }
}
function clearSession() {
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) { console.error("could not clear session folder:", e.message); }
}

// Stop every timer and close the socket -- used before starting a new attempt or going idle,
// so there is never more than ONE socket and ONE polling loop running.
function stopEverything() {
  for (const t of [sendTimer, idleTimer]) if (t) clearInterval(t);
  for (const t of [qrTimer, reconnectTimer]) if (t) clearTimeout(t);
  sendTimer = idleTimer = qrTimer = reconnectTimer = null;
  if (currentSock) {
    try { currentSock.ev.removeAllListeners(); } catch {}
    try { currentSock.end?.(new Error("stopped")); } catch {}
    currentSock = null;
  }
}

// Not linked: wait quietly for the CMS "Connect (show QR)" button.
async function goIdle(reason) {
  stopEverything();
  qrStartedAt = 0;
  console.log(`\nâ¸  WhatsApp not connected (${reason}). Waiting for you to press "Connect (show QR)" in the CMS (WhatsApp > Settings).\n`);
  await callWebhook({ type: "connection_update", status: "not_connected", error: reason });
  const check = async () => {
    const data = await fetchPending();
    if (data && data.connect_requested) {
      console.log("\nâ–¶  Connect pressed in the CMS -- creating a QR code...\n");
      clearSession();
      safeStart();
    }
  };
  idleTimer = setInterval(check, IDLE_POLL_MS);
  check();
}

function giveUpOnQr() {
  clearSession();
  goIdle("QR code was not scanned within 3 minutes. Press Connect to try again.");
}

// Network drop with a still-valid session: reconnect by itself, no QR. Waits longer each
// failed try (10s, 20s, 40s ... up to 5 min) so a long outage never floods anything.
let reconnectAttempts = 0;
function scheduleReconnect() {
  stopEverything();
  const delay = Math.min(RECONNECT_DELAY_MS * 2 ** reconnectAttempts, 5 * 60 * 1000);
  reconnectAttempts++;
  console.log(`\nConnection dropped -- reconnecting with the saved session in ${Math.round(delay / 1000)}s (no QR needed)...\n`);
  if (reconnectAttempts === 1) callWebhook({ type: "connection_update", status: "error", error: "Connection dropped, reconnecting automatically..." });
  reconnectTimer = setTimeout(safeStart, delay);
}

function safeStart() {
  start().catch((e) => { console.error("start failed:", e.message); scheduleReconnect(); });
}

async function start() {
  stopEverything();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false });
  currentSock = sock;

  sock.ev.on("creds.update", saveCreds);
  let pairingRequested = false;

  sock.ev.on("connection.update", async (update) => {
    if (sock !== currentSock) return; // an old, replaced socket -- ignore it
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Give up on an unscanned QR after 3 minutes instead of rotating QRs forever.
      if (!qrStartedAt) qrStartedAt = Date.now();
      if (Date.now() - qrStartedAt > QR_TIMEOUT_MS) return giveUpOnQr();
      if (!qrTimer) qrTimer = setTimeout(giveUpOnQr, QR_TIMEOUT_MS - (Date.now() - qrStartedAt));
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
        console.log("\n=== Scan this QR code (or scan it in the CMS: WhatsApp > Settings) ===\n");
        printAsciiQr(qr);
      }
      await callWebhook({ type: "connection_update", status: "connecting", qr_code: qr });
    }

    if (connection === "open") {
      if (qrTimer) { clearTimeout(qrTimer); qrTimer = null; }
      qrStartedAt = 0;
      reconnectAttempts = 0;
      const phone = jidToPhone(sock.user?.id);
      console.log(`\nâœ… Connected to WhatsApp as ${phone}.\n`);
      await callWebhook({ type: "connection_update", status: "connected", phone_number: phone });
      if (!sendTimer) sendTimer = setInterval(() => pollAndSend(sock), SEND_POLL_MS);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        clearSession();
        const wasManual = manualDisconnectRequested;
        manualDisconnectRequested = false;
        goIdle(wasManual
          ? "Disconnected from the CMS. Press Connect to link again."
          : "WhatsApp logged this device out. Press Connect to link again.");
      } else if (statusCode === DisconnectReason.restartRequired) {
        // Normal: WhatsApp asks for one quick restart right after the QR is scanned.
        stopEverything();
        reconnectTimer = setTimeout(safeStart, 1000);
      } else if (qrStartedAt && !hasSavedSession()) {
        // Still in the QR stage -- try again quickly, but never past the 3-minute limit.
        if (Date.now() - qrStartedAt > QR_TIMEOUT_MS) return giveUpOnQr();
        stopEverything();
        reconnectTimer = setTimeout(safeStart, 2000);
      } else {
        scheduleReconnect();
      }
    }
  });

  // â”€â”€ Incoming WhatsApp messages â†’ push into the CMS inbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;
      if (m.key.remoteJid?.endsWith("@g.us")) continue; // 1:1 chats only

      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        (m.message.imageMessage ? "[Photo]" : m.message.videoMessage ? "[Video]" : m.message.audioMessage ? "[Voice message]" : m.message.documentMessage ? "[Document]" : "[Unsupported message type]");

      if (m.key.fromMe) {
        if (ADMIN_NUMBER && jidToPhone(m.key.remoteJid) === ADMIN_NUMBER && text) {
          await callWebhook({ type: "admin_reply_in", body: text });
        }
        continue;
      }

      const from = jidToPhone(m.key.remoteJid);
      if (!from) continue;
      await callWebhook({ type: "message_in", from, name: m.pushName || undefined, body: text, wa_message_id: m.key.id });
    }
  });
}

// â”€â”€ Outgoing: while connected, check the CMS for queued messages and send them â”€â”€
async function pollAndSend(sock) {
  if (sock !== currentSock) return;
  const data = await fetchPending();
  if (!data) return;

  if (data.disconnect_requested && !manualDisconnectRequested) {
    manualDisconnectRequested = true;
    try { await sock.logout(); } catch (e) { console.error("logout error:", e.message); }
    return;
  }

  for (const row of data.pending || []) {
    const toPhone = row.whatsapp_conversations?.wa_phone;
    if (!toPhone || !row.body) continue;
    try {
      const sent = await sock.sendMessage(phoneToJid(toPhone), { text: row.body });
      await callWebhook({ type: "status_update", message_id: row.id, wa_message_id: sent?.key?.id, status: "sent" });
    } catch (e) {
      await callWebhook({ type: "status_update", message_id: row.id, status: "failed", error: e.message });
    }
  }
}

// â”€â”€ Startup: reuse the saved session if there is one; otherwise wait for Connect â”€â”€
if (hasSavedSession()) {
  safeStart();
} else {
  goIdle("Not linked yet. Press Connect to show a QR code.");
}
