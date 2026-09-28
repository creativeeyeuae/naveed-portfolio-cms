-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0009 — Email Designer (templates, campaigns, per-recipient send log)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Presented for review, same convention as every
-- prior migration in this folder -- nothing here runs until you explicitly
-- say to run it (paste into the Supabase SQL editor).
--
-- SCOPE: additive only. Creates 3 new tables. Touches no existing table.
--   - email_templates    -- saved visual-designer templates (blocks as jsonb)
--   - email_campaigns    -- one send job: a template + an audience + a
--                           communication-preference category + a status
--   - email_messages     -- one row per recipient per campaign: the actual
--                           delivery outcome (sent/failed/skipped), so a
--                           campaign's history/delivery-status view has
--                           real data, never fabricated
--   Every category on a campaign maps to the consent_category enum already
--   created by migration 0008 -- a campaign can only ever reach a contact
--   who has explicitly opted in to that exact category (communication_
--   preferences.allowed = true). No contact has any consent recorded yet
--   by default (0008 assumes nothing), so a brand-new campaign will find
--   zero eligible recipients until consent is turned on per contact --
--   this is intentional, not a bug.
--   RLS enabled with ZERO policies (deny-all), identical pattern to every
--   other CRM table -- only the service-role admin Functions can read/write.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid references public.email_templates(id) on delete set null,
  category consent_category not null,
  audience jsonb not null default '{"type":"all"}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_campaigns_status on public.email_campaigns(status);

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  to_email text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped_no_consent','skipped_no_email')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_messages_campaign on public.email_messages(campaign_id);

alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_messages enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0009
-- ═══════════════════════════════════════════════════════════════════════════
