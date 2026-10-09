-- Migration 0020: Manual WhatsApp "Connect" button
--
-- New rule (Naveed's decision): the bridge connects ONCE and stays connected. If WhatsApp
-- ever logs it out, the bridge does NOT generate QR codes on its own any more -- it waits
-- quietly until Naveed presses "Connect" in the CMS (WhatsApp > Settings), and only then
-- shows a QR to scan.
--
-- Flow: CMS "Connect" button -> POST /api/admin/whatsapp/connect sets connect_requested=true
-- -> the idle bridge sees it (checks once a minute) -> generates a QR -> CMS shows it ->
-- scan -> connected. The webhook clears the flag as soon as the bridge reports back.
--
-- Also includes migration 0018's column (safe if 0018 already ran) and allows the
-- 'disconnecting' status the existing Disconnect button already writes.
--
-- Run this once in the Supabase SQL editor.

alter table public.whatsapp_connection
  add column if not exists disconnect_requested boolean not null default false;

alter table public.whatsapp_connection
  add column if not exists connect_requested boolean not null default false;

alter table public.whatsapp_connection
  drop constraint if exists whatsapp_connection_status_check;

alter table public.whatsapp_connection
  add constraint whatsapp_connection_status_check
  check (status in ('not_connected','connecting','connected','error','disconnecting'));
