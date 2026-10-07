-- Migration 0019: WhatsApp Broadcasts
--
-- Lets Naveed send one message to a chosen set of EXISTING WhatsApp conversations (people
-- who have already messaged him / he's already messaged -- never a cold list of numbers).
-- Built with safety first: sending bulk messages from a personal/unofficial WhatsApp number
-- (this bridge, not Meta's Business API) is the single biggest trigger for a ban, so every
-- broadcast is spaced out over time instead of firing all at once -- see send_after below.
--
-- ADDITIVE ONLY. One new table, two new (nullable) columns on the existing whatsapp_messages
-- table. No existing row, column, or constraint is changed or removed.
--
-- whatsapp_broadcasts -- one row per broadcast campaign.
--   recipient_conversation_ids: the whatsapp_conversations ids chosen at creation time, so a
--   draft remembers its audience without a separate join table.
--   status: draft (created, not yet sending) -> sending (recipient messages queued with
--   staggered send_after times) -> completed / cancelled.
--
-- whatsapp_messages.broadcast_id -- which broadcast (if any) queued this outbound message,
-- so progress/counts can be computed with a simple query instead of a separate counter that
-- could drift out of sync.
-- whatsapp_messages.send_after -- null means "send whenever the bridge next polls" (today's
-- existing behavior, unaffected for every non-broadcast message). A broadcast sets this to a
-- staggered future timestamp per recipient; functions/api/whatsapp/pending.ts (the endpoint
-- the bridge polls) only returns rows whose send_after has arrived, so the bridge's existing
-- send loop naturally drips a broadcast out over minutes/hours instead of blasting it in one
-- burst -- no change needed to the bridge itself.
--
-- STATUS: NOT YET EXECUTED as of 2026-10-07. Run this in the Supabase SQL editor.

create table if not exists public.whatsapp_broadcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  recipient_conversation_ids jsonb not null default '[]'::jsonb,
  total_recipients integer not null default 0,
  status text not null default 'draft' check (status in ('draft','sending','completed','cancelled')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.whatsapp_messages
add column if not exists broadcast_id uuid references public.whatsapp_broadcasts(id) on delete set null;
alter table public.whatsapp_messages
add column if not exists send_after timestamptz;

create index if not exists idx_whatsapp_messages_broadcast on public.whatsapp_messages(broadcast_id);

alter table public.whatsapp_broadcasts enable row level security;
-- RLS enabled with ZERO policies (deny-all) -- same pattern as every other CRM/WhatsApp
-- table. Only the service-role Functions (requireAdmin-gated) can read/write.
