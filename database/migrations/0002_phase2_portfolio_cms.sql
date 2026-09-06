-- ============================================================================
-- Migration 0002: Phase 2 Portfolio CMS foundation
-- ============================================================================
-- SCOPE: additive only. This migration:
--   - Creates NEW tables only (CREATE TABLE IF NOT EXISTS throughout, as a
--     defense-in-depth guard even though each was individually confirmed
--     absent via a read-only Supabase REST probe on 2026-09-06).
--   - Creates NEW enum types only (guarded so re-running is a no-op).
--   - Adds exactly two ADD CONSTRAINT statements at the very end, to close
--     the one circular foreign key (albums.cover_media_id <-> media_assets)
--     -- these ADD a constraint only; nothing is dropped or altered.
--   - Does NOT touch, in any way: settings, testimonials, bookings, clients,
--     services, packages, portfolio_projects, portfolio_categories,
--     portfolio_images, videos, media, site_settings -- every real,
--     already-populated table this project's Supabase database has today.
--     Four of those names collide with new concepts here, so the new
--     tables use different names instead (app_settings, app_testimonials,
--     app_bookings, crm_clients) -- see database/schema.prisma header.
--   - Contains no DROP, no ALTER ... ALTER COLUMN, no DELETE, no TRUNCATE.
--
-- HOW TO RUN (do NOT run via `prisma migrate dev` / `prisma db push`):
--   This project has no prior Prisma migration history (no migrations/
--   folder ever existed before this file), so a schema-diffing Prisma
--   command would try to reconcile the ENTIRE schema.prisma against the
--   database -- including services/packages, which already exist -- and
--   would either error or attempt something outside this migration's
--   reviewed scope. Apply this file directly and only this file, e.g.:
--     psql "$DATABASE_URL" -f database/migrations/0002_phase2_portfolio_cms.sql
--   or paste it into the Supabase SQL editor. Then mark it as applied in
--   whatever migration-tracking approach is adopted (out of scope here).
--
-- STATUS: NOT YET EXECUTED. Presented for review per the standing rule --
-- do not run this against the real database until explicitly approved.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM TYPES (guarded -- CREATE TYPE has no native IF NOT EXISTS)
-- ----------------------------------------------------------------------------

do $$ begin
  create type user_role as enum ('admin', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type content_type as enum ('photography', 'cinematography');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type orientation_type as enum ('portrait', 'landscape');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type media_kind as enum ('image', 'video');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type post_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- USERS & CRM CLIENTS (new -- does not touch the real `clients` table)
-- ----------------------------------------------------------------------------

create table if not exists users (
    id              uuid primary key default uuid_generate_v4(),
    auth_id         uuid unique,
    email           text unique not null,
    role            user_role not null default 'client',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists crm_clients (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid references users(id) on delete cascade,
    name            text not null,
    company         text,
    phone           text,
    notes           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TAXONOMY (new -- does not touch the real `portfolio_categories` table)
-- ----------------------------------------------------------------------------

create table if not exists categories (
    id              uuid primary key default uuid_generate_v4(),
    type            content_type not null,
    name            text not null,
    slug            text not null,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),
    unique (type, slug)
);

create table if not exists tags (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    slug            text unique not null,
    created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ALBUMS / PROJECTS (new -- does not touch the real `portfolio_projects`)
-- cover_media_id is a plain uuid column here, no inline FK, to avoid the
-- circular reference with media_assets; the FK is added at the end of this
-- file once media_assets exists.
-- ----------------------------------------------------------------------------

create table if not exists albums (
    id              uuid primary key default uuid_generate_v4(),
    type            content_type not null,
    category_id     uuid references categories(id) on delete set null,
    title           text not null,
    slug            text unique not null,
    description     text,
    full_description text,
    location        text,
    project_date    date,
    youtube_url     text,
    client_name     text,
    seo_title       text,
    seo_description text,
    client_id       uuid references crm_clients(id) on delete set null,
    cover_media_id  uuid,
    is_featured     boolean not null default false,
    is_published    boolean not null default true,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists album_tags (
    album_id        uuid references albums(id) on delete cascade,
    tag_id          uuid references tags(id) on delete cascade,
    primary key (album_id, tag_id)
);

create table if not exists album_categories (
    album_id        uuid references albums(id) on delete cascade,
    category_id     uuid references categories(id) on delete cascade,
    primary key (album_id, category_id)
);

-- ----------------------------------------------------------------------------
-- MEDIA ASSETS (new -- does not touch the real, empty `media` table)
-- R2 key columns are nullable: an externally-hosted item (e.g. a YouTube
-- video referenced by URL) has no R2 object at all.
-- ----------------------------------------------------------------------------

create table if not exists media_assets (
    id                  uuid primary key default uuid_generate_v4(),
    album_id            uuid references albums(id) on delete cascade,
    kind                media_kind not null,
    orientation         orientation_type,
    width               int,
    height              int,
    alt_text            text,
    original_key        text,
    web_key             text,
    thumbnail_key       text,
    watermarked_key     text,
    external_url        text,
    duration_seconds    int,
    sort_order          int not null default 0,
    created_at          timestamptz not null default now()
);

create table if not exists gallery_access (
    id              uuid primary key default uuid_generate_v4(),
    album_id        uuid references albums(id) on delete cascade,
    client_id       uuid references crm_clients(id) on delete cascade,
    password_hash   text,
    allow_download  boolean not null default true,
    expires_at      timestamptz,
    created_at      timestamptz not null default now(),
    check (client_id is not null or password_hash is not null)
);

create table if not exists download_log (
    id              uuid primary key default uuid_generate_v4(),
    media_id        uuid references media_assets(id) on delete cascade,
    client_id       uuid references crm_clients(id) on delete set null,
    ip_address      inet,
    downloaded_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BOOKINGS & CONTACT
-- app_bookings is new (does not touch the real, empty `bookings` table).
-- contact_submissions is new (does not touch the OLD system's separate
-- `nap_contact_submissions` site_settings key, which this migration never
-- reads or writes).
-- ----------------------------------------------------------------------------

create table if not exists app_bookings (
    id              uuid primary key default uuid_generate_v4(),
    client_name     text not null,
    email           text not null,
    phone           text,
    service_type    text,
    event_date      date,
    location        text,
    budget          text,
    message         text,
    status          booking_status not null default 'pending',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists contact_submissions (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    email           text not null,
    phone           text,
    subject         text,
    message         text not null,
    is_read         boolean not null default false,
    created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BLOG / JOURNAL (new)
-- ----------------------------------------------------------------------------

create table if not exists blog_posts (
    id              uuid primary key default uuid_generate_v4(),
    title           text not null,
    slug            text unique not null,
    excerpt         text,
    content         text not null,
    category        text,
    seo_title       text,
    seo_description text,
    cover_media_id  uuid references media_assets(id) on delete set null,
    author_id       uuid references users(id) on delete set null,
    status          post_status not null default 'draft',
    published_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TESTIMONIALS & CLIENT LOGOS
-- app_testimonials is new -- does NOT touch the real `testimonials` table,
-- which already holds 3 rows confirmed (read-only export) to be the exact
-- same placeholder names as the old site's hardcoded defaults.
-- ----------------------------------------------------------------------------

create table if not exists app_testimonials (
    id              uuid primary key default uuid_generate_v4(),
    client_name     text not null,
    role            text,
    company         text,
    quote           text not null,
    rating          smallint check (rating between 1 and 5),
    avatar_url      text,
    is_featured     boolean not null default false,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now()
);

create table if not exists client_logos (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    logo_url        text not null,
    website_url     text,
    sort_order      int not null default 0
);

-- ----------------------------------------------------------------------------
-- SEO & ANALYTICS (new)
-- ----------------------------------------------------------------------------

create table if not exists seo_metadata (
    id              uuid primary key default uuid_generate_v4(),
    page_path       text unique not null,
    title           text,
    description     text,
    og_image_url    text,
    json_ld         jsonb,
    updated_at      timestamptz not null default now()
);

create table if not exists analytics_events (
    id              uuid primary key default uuid_generate_v4(),
    event_type      text not null,
    page_path       text,
    metadata        jsonb,
    created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SETTINGS
-- app_settings is new -- does NOT touch the real `settings` table (seed/
-- placeholder key-value rows) or the OLD system's separate `site_settings`
-- table (13 real flat keys) or its nap_* blob keys.
-- ----------------------------------------------------------------------------

create table if not exists app_settings (
    id              uuid primary key default uuid_generate_v4(),
    key             text unique not null,
    value           jsonb not null,
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- INDEXES (guarded)
-- ----------------------------------------------------------------------------

create index if not exists idx_albums_type on albums(type);
create index if not exists idx_albums_category on albums(category_id);
create index if not exists idx_album_categories_category on album_categories(category_id);
create index if not exists idx_media_assets_album on media_assets(album_id);
create index if not exists idx_gallery_access_album on gallery_access(album_id);
create index if not exists idx_app_bookings_status on app_bookings(status);
create index if not exists idx_blog_posts_status on blog_posts(status);
create index if not exists idx_analytics_events_type on analytics_events(event_type);
create index if not exists idx_analytics_events_created on analytics_events(created_at);

-- ----------------------------------------------------------------------------
-- CIRCULAR FK CLOSURE (the only non-CREATE statements in this file)
-- albums.cover_media_id -> media_assets.id
-- media_assets.album_id -> albums.id (already added inline above)
-- ADDS a constraint only. Never drops or alters an existing column/table.
-- Guarded so re-running this file is a no-op if already applied.
-- ----------------------------------------------------------------------------

do $$ begin
  alter table albums
    add constraint fk_albums_cover_media
    foreign key (cover_media_id) references media_assets(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table albums
    add constraint uq_albums_cover_media unique (cover_media_id);
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- END OF MIGRATION 0002
-- ============================================================================
