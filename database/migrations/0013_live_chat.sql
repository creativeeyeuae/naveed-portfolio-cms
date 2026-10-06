-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0013 — On-site Live Chat (visitor <-> admin, stays on the website)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Same convention as every prior migration in this folder --
-- nothing here runs until you explicitly say to run it (paste into the Supabase SQL
-- editor, or `psql ... -f`).
--
-- WHY A NEW TABLE INSTEAD OF REUSING client_messages OR whatsapp_messages:
--   - client_messages (migration 0006) requires a real, signed-in Supabase Auth account
--     (email+password) -- far too much friction for a floating "just start typing" chat
--     bubble, and this project's client login is for existing clients, not casual visitors.
--   - whatsapp_messages (migration 0010) is purpose-built for the FUTURE real WhatsApp
--     bridge/QR-connect server (wa_phone, wa_message_id, delivery status) -- intentionally
--     left isolated so that later build never has to untangle a second meaning for its
--     rows. Live Chat visitors are not WhatsApp contacts (yet), so they don't belong there.
--   - Instead this reuses the EXISTING lightweight "visitors" identity (migration 0004,
--     functions/api/visitor/identify.ts) already used for likes/comments: no password,
--     name+email+whatsapp once, remembered via the existing signed session cookie. Anyone
--     who already liked or commented is recognized for chat immediately, zero extra steps.
--
-- SCOPE: additive only.
--   - Creates ONE new table (live_chat_messages), referencing the existing visitors table.
--   - RLS enabled, ZERO policies attached -- same deny-all-by-default pattern as every
--     other visitor-engagement table in this project. Every read/write goes through
--     functions/api/visitor/chat.ts (visitor side) or functions/api/admin/livechat.ts
--     (admin side), both using the service-role key -- never a public RLS policy.
--   - Contains no DROP, no ALTER, no DELETE, no TRUNCATE.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.live_chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  visitor_id          uuid not null references public.visitors(id) on delete cascade,
  sender              text not null check (sender in ('visitor', 'admin')),
  body                text not null,
  is_read_by_admin    boolean not null default false,
  is_read_by_visitor  boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_live_chat_messages_visitor on public.live_chat_messages(visitor_id, created_at);

alter table public.live_chat_messages enable row level security;
-- No policies attached -- deny-all for anon/authenticated by design (see header above).

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0013
-- ═══════════════════════════════════════════════════════════════════════════
