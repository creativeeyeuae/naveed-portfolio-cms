-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0006 — Client <-> Admin Messages
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Same convention as 0004/0005: presented for review here,
-- run manually against the real Supabase database (SQL editor) when ready -- nothing in
-- this file runs automatically, and nothing else in this deploy depends on it having run
-- yet (the client portal's Messages tab will just show "Could not load your messages"
-- until it has).
--
-- SCOPE: additive only.
--   - Creates ONE new table (client_messages). Touches zero existing tables/columns/rows.
--   - RLS enabled, ZERO policies attached -- same pattern as 0004's visitor-engagement
--     tables. Every read/write goes through functions/api/client/messages.ts or
--     functions/api/admin/messages.ts, both using the service-role key and deriving the
--     caller's own customer_id server-side (see functions/_shared/clientAuth.ts) --
--     never an anon/authenticated RLS policy, so none is needed here.
--   - Contains no DROP, no ALTER, no DELETE, no TRUNCATE.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.client_messages (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers(id) on delete cascade,
  sender              text not null check (sender in ('client', 'admin')),
  sender_name         text,
  body                text not null,
  is_read_by_admin    boolean not null default false,
  is_read_by_client   boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_client_messages_customer on public.client_messages(customer_id, created_at);

alter table public.client_messages enable row level security;
-- No policies attached -- deny-all for anon/authenticated by design (see header above).

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0006
-- ═══════════════════════════════════════════════════════════════════════════
