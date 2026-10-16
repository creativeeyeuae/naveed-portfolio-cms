-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0026 — Scheduled daily email drip for Companies
-- ═══════════════════════════════════════════════════════════════════════════
-- e.g. "Interior Design companies, 50 a day, template X, 10:00 Dubai, Mon–Fri":
-- each send day the scheduler emails the next batch, until the list is finished.
--
-- Fully free: Supabase pg_cron + pg_net (included on the free plan) call the CMS
-- endpoint /api/cron/email-schedules every 5 minutes; that endpoint sends a few emails
-- per call through the existing safe sender (daily cap, unsubscribes, bounces, MX check).
-- No AI is involved, so no tokens are used.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.email_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_id uuid not null references public.email_templates(id) on delete restrict,
  company_ids uuid[] not null,              -- the ordered list, frozen when the schedule is made
  batch_size int not null default 50 check (batch_size between 1 and 500),
  send_time text not null default '10:00', -- HH:MM, Dubai time
  days int[] not null default '{1,2,3,4,5}', -- 0=Sun .. 6=Sat (Dubai)
  next_index int not null default 0,        -- position in company_ids of the next batch
  next_run_at timestamptz not null,
  current_campaign_id uuid references public.email_campaigns(id) on delete set null,
  status text not null default 'active' check (status in ('active','paused','done')),
  sent_count int not null default 0,
  batches_done int not null default 0,
  last_run_at timestamptz,
  last_note text,
  locked_until timestamptz,
  filter_label text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_schedules_due on public.email_schedules(status, next_run_at);
alter table public.email_schedules enable row level security;

-- Shared token between the pg_cron job and /api/cron/email-schedules. Generated inside the
-- database, never written in code or git. Service-role only (RLS on, no policies).
create table if not exists public.cron_tokens (
  name text primary key,
  token text not null,
  created_at timestamptz not null default now()
);
alter table public.cron_tokens enable row level security;
insert into public.cron_tokens (name, token)
values ('email-schedules', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Every 5 minutes, call the CMS scheduler endpoint with the token.
select cron.unschedule(jobid) from cron.job where jobname = 'email-schedules';
select cron.schedule('email-schedules', '*/5 * * * *', format($job$
  select net.http_post(
    url := 'https://bynaveedanjum.com/api/cron/email-schedules',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$, (select token from public.cron_tokens where name = 'email-schedules')));

-- To stop it: select cron.unschedule('email-schedules');
