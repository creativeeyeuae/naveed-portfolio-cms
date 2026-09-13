-- ============================================================================
-- Migration 0003: SEO Agent (Phase 1) -- crawler, audit engine, task tracking
-- ============================================================================
-- SCOPE: additive only, exactly like 0002_phase2_portfolio_cms.sql before it.
--   - Four brand-new tables (CREATE TABLE IF NOT EXISTS), none of these names
--     collide with anything already in the real database.
--   - No DROP, no ALTER on any existing table, no DELETE, no TRUNCATE.
--   - RLS is enabled on all four with ZERO policies attached on purpose --
--     that means the anon key and any authenticated user get NOTHING (RLS
--     with no policy = deny-all), while the service-role key used by the
--     /api/admin/seo/* Cloudflare Pages Functions bypasses RLS entirely, as
--     it already does for every other admin-only table in this project.
--     This is the "strengthen, never weaken, RLS" rule applied to new data.
--
-- WHAT THESE TABLES ARE FOR (Phase 1 of the SEO Agent build):
--   seo_audits      -- one row per crawl run (real bynaveedanjum.com fetch,
--                       done by the crawler function). Stores the 9-category
--                       score breakdown for that run.
--   seo_issues      -- one row per individual finding from a run (missing
--                       title, missing meta description, missing H1, images
--                       without alt text, missing canonical, incomplete Open
--                       Graph tags, missing structured data, missing
--                       viewport tag, thin content). Every row traces back
--                       to the audit that found it and the real page it's on.
--   seo_change_log  -- audit trail of every status change made to an issue
--                       (ignored / reopened today; will also record real
--                       auto-fix applications once those are built, with
--                       old/new values, so they can be undone).
--   seo_settings    -- reserved key/value store for Phase 2 configuration
--                       (schedules, provider connection state, etc.) -- not
--                       used yet, created now so later phases don't need
--                       another migration just for settings storage.
--
-- HOW TO RUN: same as 0002 -- paste into the Supabase SQL editor for this
-- project (or `psql "$DATABASE_URL" -f database/migrations/0003_seo_agent.sql`)
-- and run it once. Claude cannot run this migration itself: creating tables
-- requires a direct Postgres/SQL-editor connection, which is intentionally
-- not something handed to Claude -- only the app's own service-role key,
-- used inside the already-reviewed Cloudflare Functions below, is used for
-- day-to-day reads/writes once these tables exist.
--
-- STATUS: NOT YET EXECUTED. Presented for review -- please run this in the
-- Supabase SQL editor before using the new "SEO Agent" tab in the CMS.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- seo_audits -- one row per crawl/audit run
-- ----------------------------------------------------------------------------
create table if not exists seo_audits (
    id                  uuid primary key default uuid_generate_v4(),
    started_at          timestamptz not null default now(),
    finished_at         timestamptz,
    status              text not null default 'running',   -- 'running' | 'completed' | 'failed'
    pages_crawled       int not null default 0,
    total_issues        int not null default 0,
    score_by_category   jsonb,                              -- {"Titles":92,"Meta Descriptions":80,...}
    error               text,
    triggered_by        text,                               -- admin email that clicked "Run"
    created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- seo_issues -- one row per finding from a specific audit run
-- ----------------------------------------------------------------------------
create table if not exists seo_issues (
    id                  uuid primary key default uuid_generate_v4(),
    audit_id            uuid references seo_audits(id) on delete cascade,
    page_path           text not null,                     -- e.g. "/work/some-slug"
    page_url            text not null,                     -- full URL that was actually fetched
    category            text not null,                      -- one of the 9 scored categories
    severity            text not null,                       -- 'critical'|'high'|'medium'|'low'|'opportunity'
    title               text not null,                       -- short finding title
    description         text not null,                       -- why it matters
    recommendation      text,                                 -- what to do about it
    current_value       text,
    recommended_value   text,
    auto_fixable        boolean not null default false,
    status              text not null default 'open',         -- 'open'|'ignored'|'fixed'
    source              text not null default 'seo-agent-crawler',
    detected_at         timestamptz not null default now(),
    resolved_at         timestamptz
);

-- ----------------------------------------------------------------------------
-- seo_change_log -- audit trail for every action taken on an issue (undo-able)
-- ----------------------------------------------------------------------------
create table if not exists seo_change_log (
    id                  uuid primary key default uuid_generate_v4(),
    issue_id            uuid references seo_issues(id) on delete cascade,
    page_path           text,
    field               text not null,                        -- e.g. "status", "seo_description"
    old_value           text,
    new_value           text,
    applied_by          text,                                 -- admin email
    applied_at          timestamptz not null default now(),
    reverted_at         timestamptz
);

-- ----------------------------------------------------------------------------
-- seo_settings -- reserved for Phase 2 (schedules, provider connection state)
-- ----------------------------------------------------------------------------
create table if not exists seo_settings (
    id                  uuid primary key default uuid_generate_v4(),
    key                 text unique not null,
    value               jsonb not null,
    updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_seo_issues_audit on seo_issues(audit_id);
create index if not exists idx_seo_issues_status on seo_issues(status);
create index if not exists idx_seo_issues_severity on seo_issues(severity);
create index if not exists idx_seo_change_log_issue on seo_change_log(issue_id);
create index if not exists idx_seo_audits_started on seo_audits(started_at);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY -- enabled, zero policies = deny-all for anon/authenticated.
-- Only the service-role key (used server-side inside the /api/admin/seo/*
-- Cloudflare Pages Functions, which already require a verified admin session
-- via _shared/adminAuth.ts) can read or write these tables.
-- ----------------------------------------------------------------------------
alter table seo_audits enable row level security;
alter table seo_issues enable row level security;
alter table seo_change_log enable row level security;
alter table seo_settings enable row level security;
