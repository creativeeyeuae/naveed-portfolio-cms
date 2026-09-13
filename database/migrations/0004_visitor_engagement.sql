-- ============================================================================
-- Migration 0004: Visitor engagement -- likes, comments, image permission requests
-- ============================================================================
-- SCOPE: additive only, same pattern as 0003_seo_agent.sql before it.
--   - Four brand-new tables (CREATE TABLE IF NOT EXISTS), none of these
--     names collide with anything already in the real database (checked
--     against 0002's abandoned/never-applied schema and the real, live
--     site_settings/appointments/customers/payments tables this project
--     actually uses).
--   - No DROP, no ALTER on any existing table, no DELETE, no TRUNCATE.
--   - RLS enabled on all four with ZERO policies attached on purpose --
--     anon/authenticated get NOTHING directly; every real read/write goes
--     through admin-auth-gated or session-validated Cloudflare Pages
--     Functions using the service-role key (functions/api/likes.ts,
--     comments.ts, permission-requests.ts, visitor/*.ts, admin/*.ts),
--     exactly like every other table this project protects this way.
--
-- WHY project_id/image_id ARE PLAIN TEXT, NOT FOREIGN KEYS:
--   Real portfolio projects are NOT rows in a relational table -- they are
--   JSON objects inside the site_settings("nap_projects") blob that the
--   CMS Portfolio tab already reads/writes (see lib/cmsData.ts). There is
--   no real `projects` table to reference. project_id here is that JSON
--   object's own "id" (e.g. "p1"), and project_name_snapshot/
--   image_url_snapshot below capture what the project/image looked like
--   at request time, so a historical request stays identifiable even if
--   the admin later edits or removes that project/image.
--
-- HOW TO RUN: paste into the Supabase SQL editor for this project (or
-- `psql "$DATABASE_URL" -f database/migrations/0004_visitor_engagement.sql`).
-- STATUS: NOT YET EXECUTED. Presented for review before running.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- VISITORS -- lightweight identity for likes/comments/permission requests.
-- No password: a visitor signs up with name/email/whatsapp only, then is
-- identified across future visits via a secure server-signed session cookie
-- (see functions/_shared/visitorAuth.ts) -- never a plain editable cookie.
-- Deliberately separate from the existing Supabase Auth admin login, which
-- this migration/feature never touches.
-- ----------------------------------------------------------------------------
create table if not exists visitors (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    email           text unique not null,
    whatsapp        text not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROJECT LIKES -- one real, shared, deduped like per (project, visitor).
-- ----------------------------------------------------------------------------
create table if not exists project_likes (
    id              uuid primary key default uuid_generate_v4(),
    project_id      text not null,
    visitor_id      uuid not null references visitors(id) on delete cascade,
    created_at      timestamptz not null default now(),
    unique (project_id, visitor_id)
);

-- ----------------------------------------------------------------------------
-- PROJECT COMMENTS -- moderated. Public visitors only ever see 'approved'.
-- ----------------------------------------------------------------------------
create table if not exists project_comments (
    id              uuid primary key default uuid_generate_v4(),
    project_id      text not null,
    visitor_id      uuid not null references visitors(id) on delete cascade,
    comment         text not null,
    status          text not null default 'pending',   -- pending|approved|hidden|deleted
    created_at      timestamptz not null default now(),
    moderated_at    timestamptz,
    moderated_by    text
);

-- ----------------------------------------------------------------------------
-- IMAGE PERMISSION REQUESTS -- manual-approval-only workflow. Never auto-grants.
-- ----------------------------------------------------------------------------
create table if not exists image_permission_requests (
    id                      uuid primary key default uuid_generate_v4(),
    project_id              text not null,
    image_id                text,
    project_name_snapshot   text,
    image_url_snapshot      text not null,
    visitor_id              uuid references visitors(id) on delete set null,
    requester_name          text not null,
    requester_email         text not null,
    requester_whatsapp      text not null,
    usage_types             text[] not null default '{}',
    usage_url               text,
    usage_description       text,
    copyright_acknowledged  boolean not null default false,
    status                  text not null default 'pending', -- pending|approved|rejected|cancelled
    admin_notes             text,
    rejection_reason        text,
    credit_required         boolean,
    credit_text              text,
    approved_usage          text,
    created_at              timestamptz not null default now(),
    reviewed_at             timestamptz,
    reviewed_by             text
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_project_likes_project on project_likes(project_id);
create index if not exists idx_project_comments_project_status on project_comments(project_id, status);
create index if not exists idx_project_comments_visitor on project_comments(visitor_id);
create index if not exists idx_permission_requests_project on image_permission_requests(project_id);
create index if not exists idx_permission_requests_visitor on image_permission_requests(visitor_id);
create index if not exists idx_permission_requests_status on image_permission_requests(status);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY -- enabled, zero policies = deny-all for anon/authenticated.
-- Only the service-role key (used server-side inside functions/api/likes.ts,
-- comments.ts, permission-requests.ts, visitor/*.ts and admin/*.ts, all of
-- which enforce the real access rules in application code -- own-record-only
-- for visitors, admin-session-required for moderation) can read/write these.
-- ----------------------------------------------------------------------------
alter table visitors enable row level security;
alter table project_likes enable row level security;
alter table project_comments enable row level security;
alter table image_permission_requests enable row level security;

-- ============================================================================
-- END OF MIGRATION 0004
-- ============================================================================
