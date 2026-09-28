-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0010 — WhatsApp inbox architecture (conversations, messages,
-- quick replies, connection status)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Presented for review, same convention as every
-- prior migration in this folder -- nothing here runs until you explicitly
-- say to run it (paste into the Supabase SQL editor).
--
-- SCOPE: additive only. Creates 4 new tables. Touches no existing table.
--   - whatsapp_conversations -- one row per WhatsApp contact thread. Optional
--     link to an existing CRM customer (nullable, on delete set null -- a
--     WhatsApp conversation is never lost if a customer record is deleted,
--     and deleting a conversation never touches the customer).
--   - whatsapp_messages      -- one row per message, inbound or outbound.
--     Outbound messages start as status='queued' and are NEVER marked
--     'sent' by this migration or by any Function in this phase -- nothing
--     in this codebase talks to a real WhatsApp server yet.
--   - whatsapp_quick_replies -- saved canned responses for the chat window.
--   - whatsapp_connection    -- a single-row status table the Connection
--     page reads. Seeded below as 'not_connected' and left that way --
--     nothing in this phase changes it.
--   RLS enabled with ZERO policies (deny-all), identical pattern to every
--   other CRM/Email table -- only the service-role Functions can read/write.
--   This feature is intentionally isolated: no existing table is altered,
--   and the only foreign key (customer_id) is nullable and non-cascading.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  wa_phone text not null,
  wa_name text,
  assigned_to text,
  status text not null default 'open' check (status in ('open','pending','closed')),
  unread_count integer not null default 0,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_conversations_status on public.whatsapp_conversations(status);
create index if not exists idx_whatsapp_conversations_phone on public.whatsapp_conversations(wa_phone);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  sender text,
  body text,
  media_url text,
  media_type text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','read','failed')),
  wa_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_messages_conversation on public.whatsapp_messages(conversation_id, created_at);

create table if not exists public.whatsapp_quick_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_connection (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'not_connected' check (status in ('not_connected','connecting','connected','error')),
  phone_number text,
  qr_code text,
  last_seen_at timestamptz,
  error text,
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_quick_replies enable row level security;
alter table public.whatsapp_connection enable row level security;

insert into public.whatsapp_connection (status)
select 'not_connected'
where not exists (select 1 from public.whatsapp_connection);

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0010
-- ═══════════════════════════════════════════════════════════════════════════
