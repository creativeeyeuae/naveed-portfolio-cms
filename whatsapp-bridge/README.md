# WhatsApp Bridge -- setup

This connects your real WhatsApp number to the CMS, so messages land on your
actual phone and your replies go out as real WhatsApp messages. It runs on
your own server (you said you already have one) -- it cannot run on
Cloudflare, which only runs short-lived code and can't hold a live connection.

**Risk, stated plainly again:** this uses an unofficial method (the same way
"WhatsApp Web" works), not Meta's official API. WhatsApp can detect and ban
a number connected this way. You already chose to proceed with your real
number -- just know that if it ever gets flagged, this bridge stops working
but nothing else on your site breaks.

## Before you run this

1. Run migration `0010_whatsapp.sql` in your Supabase SQL editor, if you
   haven't already (same copy-paste-and-click-Run process as every migration
   before it). This creates the 4 tables this feature needs.
2. The secret this bridge needs (`WHATSAPP_BRIDGE_SECRET`) has already been
   generated and saved to Cloudflare for you. You still need to copy that
   same value into this bridge's own `.env` file (step 2 below) so the two
   sides can recognize each other.

## Setup on your server

1. Copy this whole `whatsapp-bridge` folder to your server.
2. Copy `.env.example` to `.env` and fill in:
   - `BRIDGE_TARGET_URL=https://bynaveedanjum.com`
   - `BRIDGE_SECRET=` -- ask me for the value, or I can set it directly if I
     have terminal access to that server.
3. Install Node.js 18+ if it isn't already on the server.
4. `npm install`
5. `npm start`
6. A QR code will print right in the terminal. Open WhatsApp on the phone
   with the number you're connecting → Settings → Linked Devices → Link a
   Device → scan it.
7. Once scanned, the terminal shows "Connected", and the CMS's WhatsApp tab
   (Overview / Settings) will flip from "Not Connected" to "Connected"
   within a few seconds.

## Keeping it running 24/7

`npm start` only runs while that terminal stays open. For it to keep working
after you close the terminal or the server restarts, it needs a process
manager. The simplest is `pm2`:

```
npm install -g pm2
pm2 start index.js --name whatsapp-bridge
pm2 save
pm2 startup
```

That keeps it running in the background and restarts it automatically if the
server reboots.

## What happens after it's connected

- A message a visitor sends you on real WhatsApp shows up in the CMS's
  WhatsApp tab inbox within a few seconds, same as any other conversation.
- A reply you type in that CMS inbox is picked up by this bridge (checks
  every few seconds) and sent out as a real WhatsApp message.
- If the connection ever drops (phone offline, logged out, etc.), the CMS's
  WhatsApp → Settings page will show the real status -- it never fakes
  "Connected."
