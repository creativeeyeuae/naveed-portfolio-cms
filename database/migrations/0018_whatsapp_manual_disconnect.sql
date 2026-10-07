-- Migration 0018: Manual WhatsApp disconnect/reconnect flag
--
-- Adds ONE additive column so Naveed can click "Disconnect" in the CMS and have the
-- bridge log the current WhatsApp session out cleanly (sock.logout(), not just killing the
-- process) and immediately generate a brand-new QR code to scan -- without needing terminal/
-- VPS access himself.
--
-- Flow: CMS "Disconnect" button -> POST /api/admin/whatsapp/disconnect sets this flag true
-- -> bridge sees it on its next poll (GET /api/whatsapp/pending, already polled every ~4s)
-- -> bridge calls sock.logout(), deletes its local session folder, reports back via the
-- existing webhook, which clears this flag -> bridge reconnects and a fresh QR appears in
-- the CMS automatically.
--
-- No table, row, or existing column is touched or removed.
--
-- STATUS: NOT YET EXECUTED as of 2026-10-07. Run this in the Supabase SQL editor, same as
-- every migration before it.

alter table public.whatsapp_connection
add column if not exists disconnect_requested boolean not null default false;
