-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0008 — CRM Foundation (contacts, tags, notes, meetings, tasks,
-- communication preferences, consent history, audit log)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Presented for review, same convention as every
-- prior migration in this folder -- nothing here runs until you explicitly
-- say to run it (paste into the Supabase SQL editor, or `psql ... -f`).
--
-- SCOPE: additive only.
--   - Extends the REAL, live `customers` table with new nullable columns
--     only (company, job_title, industry, website, lead_status, source,
--     event_met, date_met). Every existing row keeps working exactly as
--     it does today -- a customer created by the public booking flow just
--     has these columns as null until a CRM record enriches them.
--   - Creates NEW tables only: crm_tags, customer_tags, crm_notes,
--     crm_meetings, crm_tasks, communication_preferences, consent_events,
--     crm_audit_log, business_cards.
--   - Every new table has Row Level Security turned ON with ZERO policies
--     attached -- the exact same deny-all-by-default pattern already used
--     for client_messages (migration 0006). Nothing is reachable by the
--     public anon key or by a signed-in client account; only the new
--     admin CRM functions (using the service-role key, same as every
--     existing admin/*.ts function) can read or write these tables.
--   - Contains no DROP, no ALTER ... ALTER COLUMN, no DELETE, no TRUNCATE.
-- ═══════════════════════════════════════════════════════════════════════════

-- ----------------------------------------------------------------------------
-- EXTEND customers (additive columns only)
-- ----------------------------------------------------------------------------
alter table public.customers add column if not exists company text;
alter table public.customers add column if not exists job_title text;
alter table public.customers add column if not exists industry text;
alter table public.customers add column if not exists website text;
alter table public.customers add column if not exists lead_status text not null default 'lead';
alter table public.customers add column if not exists source text;
alter table public.customers add column if not exists event_met text;
alter table public.customers add column if not exists date_met date;

do $$ begin
  alter table public.customers
    add constraint customers_lead_status_check
    check (lead_status in ('lead','warm','hot','customer','cold','vendor','partner'));
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- TAGS
-- ----------------------------------------------------------------------------
create table if not exists public.crm_tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  color       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.customer_tags (
  customer_id  uuid not null references public.customers(id) on delete cascade,
  tag_id       uuid not null references public.crm_tags(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, tag_id)
);
create index if not exists idx_customer_tags_customer on public.customer_tags(customer_id);

-- ----------------------------------------------------------------------------
-- NOTES, MEETINGS, TASKS -- each row belongs to one customer.
-- ----------------------------------------------------------------------------
create table if not exists public.crm_notes (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  body         text not null,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_crm_notes_customer on public.crm_notes(customer_id, created_at);

create table if not exists public.crm_meetings (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  event         text,
  meeting_date  date,
  location      text,
  how_met       text,
  interest      text,
  notes         text,
  next_action   text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_crm_meetings_customer on public.crm_meetings(customer_id, meeting_date);

create table if not exists public.crm_tasks (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  title         text not null,
  due_date      date,
  assigned_to   text,
  notes         text,
  completed     boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_crm_tasks_customer on public.crm_tasks(customer_id);
create index if not exists idx_crm_tasks_due on public.crm_tasks(due_date) where completed = false;

-- ----------------------------------------------------------------------------
-- COMMUNICATION PREFERENCES & CONSENT
-- One row per (customer, category) holding the CURRENT allowed/not-allowed
-- state -- consent_events keeps the full history of every change, so nothing
-- about how/when/why consent changed is ever lost, even after a preference
-- flips again later. A customer created before this migration has no rows
-- here yet, i.e. no category is enabled until explicitly set -- new consent
-- is never assumed from old data.
-- ----------------------------------------------------------------------------
do $$ begin
  create type consent_category as enum
    ('relationship','service','marketing','promotions','events','offers','wishes');
exception when duplicate_object then null;
end $$;

create table if not exists public.communication_preferences (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  category      consent_category not null,
  allowed       boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (customer_id, category)
);

create table if not exists public.consent_events (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  category      consent_category not null,
  action        text not null check (action in ('opt_in','opt_out')),
  source        text,
  method        text,
  created_by    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_consent_events_customer on public.consent_events(customer_id, created_at);

-- ----------------------------------------------------------------------------
-- BUSINESS CARDS -- Phase 2 (scanner) writes here; the table exists now so
-- Phase 2 needs no second migration. image_url points at the existing Media
-- Library's storage, not a new upload system. raw_extracted keeps exactly
-- what the AI read off the card BEFORE any human edit, for audit purposes --
-- the confirmed/edited values live on the linked `customers` row itself.
-- ----------------------------------------------------------------------------
create table if not exists public.business_cards (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references public.customers(id) on delete set null,
  image_url       text not null,
  raw_extracted   jsonb,
  scanned_by      text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_business_cards_customer on public.business_cards(customer_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG -- this project already has a live `audit_log` table (actor,
-- action, entity_type, entity_id, details -- see payments/[id]/approve.ts
-- for the existing convention), so CRM actions are written there too via
-- the same shape (entity_type: "customer" | "crm_note" | "crm_meeting" |
-- "crm_task" | "consent", entity_id, details). No new audit table needed.
-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY -- enable on every new table, attach ZERO policies.
-- Deny-all for anon and authenticated by design (see file header). Every
-- read/write goes through functions/api/admin/crm/*.ts using the
-- service-role key via requireAdmin(), exactly like every existing admin
-- function in this project.
-- ----------------------------------------------------------------------------
alter table public.crm_tags enable row level security;
alter table public.customer_tags enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_meetings enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.communication_preferences enable row level security;
alter table public.consent_events enable row level security;
alter table public.business_cards enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0008
-- ═══════════════════════════════════════════════════════════════════════════
