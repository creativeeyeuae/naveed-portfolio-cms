-- ============================================================================
-- naveed-portfolio-cms — Database Schema (PostgreSQL / Supabase)
-- Phase 1: Foundation
-- ============================================================================
-- Notes:
--   - Single-tenant today. Every table is structured so a `tenant_id` column
--     could be added later without restructuring relationships.
--   - UUIDs are used as primary keys throughout for Supabase/R2 friendliness.
--   - `media_assets` stores 3 derived variants per upload: thumbnail, web,
--     and original (full-res, used for downloads).
--   - Gallery access supports BOTH a per-gallery password AND per-client
--     assignment, so either mode (or both) can be used per booking.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type user_role as enum ('admin', 'client');
create type content_type as enum ('photography', 'cinematography');
create type orientation_type as enum ('portrait', 'landscape');
create type media_kind as enum ('image', 'video');
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type post_status as enum ('draft', 'published', 'archived');

-- ----------------------------------------------------------------------------
-- USERS & CLIENTS
-- (Auth identity itself lives in Supabase Auth; this table mirrors/extends it)
-- ----------------------------------------------------------------------------

create table users (
    id              uuid primary key default uuid_generate_v4(),
    auth_id         uuid unique,                -- maps to Supabase auth.users.id
    email           text unique not null,
    role            user_role not null default 'client',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table clients (
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
-- TAXONOMY: categories, tags
-- ----------------------------------------------------------------------------

create table categories (
    id              uuid primary key default uuid_generate_v4(),
    type            content_type not null,
    name            text not null,
    slug            text not null,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),
    unique (type, slug)
);

create table tags (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    slug            text unique not null,
    created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ALBUMS / PROJECTS
-- (An "album" is a project/shoot — e.g. a wedding, a commercial campaign)
-- ----------------------------------------------------------------------------

create table albums (
    id              uuid primary key default uuid_generate_v4(),
    type            content_type not null,
    category_id     uuid references categories(id) on delete set null,
    title           text not null,
    slug            text unique not null,
    description     text,
    client_id       uuid references clients(id) on delete set null,
    cover_media_id  uuid,  -- FK added after media_assets exists (see below)
    is_featured     boolean not null default false,
    is_published    boolean not null default true,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table album_tags (
    album_id        uuid references albums(id) on delete cascade,
    tag_id          uuid references tags(id) on delete cascade,
    primary key (album_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- MEDIA ASSETS
-- (Individual images/videos belonging to an album; strict portrait/landscape
--  ratio enforcement — 2160x3240 portrait, 3240x2160 landscape — is validated
--  at the application layer on upload, not in SQL.)
-- ----------------------------------------------------------------------------

create table media_assets (
    id                  uuid primary key default uuid_generate_v4(),
    album_id            uuid references albums(id) on delete cascade,
    kind                media_kind not null,
    orientation         orientation_type,
    width               int,
    height              int,
    alt_text            text,
    -- R2 object keys (not full URLs — the app builds signed/public URLs)
    original_key        text not null,   -- full-res, used for client downloads
    web_key             text not null,   -- optimized, used for public display
    thumbnail_key       text not null,   -- small, used in grids/masonry
    watermarked_key     text,            -- served publicly instead of web_key when watermark is on
    duration_seconds    int,             -- for video kind only
    sort_order          int not null default 0,
    created_at          timestamptz not null default now()
);

alter table albums
    add constraint fk_albums_cover_media
    foreign key (cover_media_id) references media_assets(id) on delete set null;

-- ----------------------------------------------------------------------------
-- GALLERY ACCESS
-- (Supports per-gallery password AND/OR per-client assignment)
-- ----------------------------------------------------------------------------

create table gallery_access (
    id              uuid primary key default uuid_generate_v4(),
    album_id        uuid references albums(id) on delete cascade,
    client_id       uuid references clients(id) on delete cascade,  -- nullable
    password_hash   text,                                            -- nullable
    allow_download  boolean not null default true,
    expires_at      timestamptz,
    created_at      timestamptz not null default now(),
    check (client_id is not null or password_hash is not null)
);

create table download_log (
    id              uuid primary key default uuid_generate_v4(),
    media_id        uuid references media_assets(id) on delete cascade,
    client_id       uuid references clients(id) on delete set null,
    ip_address      inet,
    downloaded_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BOOKINGS & CONTACT
-- ----------------------------------------------------------------------------

create table bookings (
    id              uuid primary key default uuid_generate_v4(),
    client_name     text not null,
    email           text not null,
    phone           text,
    service_type    text,             -- e.g. "Editorial Photography", "Automotive Cinematography"
    event_date      date,
    message         text,
    status          booking_status not null default 'pending',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table contact_submissions (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    email           text not null,
    subject         text,
    message         text not null,
    is_read         boolean not null default false,
    created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BLOG
-- ----------------------------------------------------------------------------

create table blog_posts (
    id              uuid primary key default uuid_generate_v4(),
    title           text not null,
    slug            text unique not null,
    excerpt         text,
    content         text not null,       -- markdown or rich JSON
    cover_media_id  uuid references media_assets(id) on delete set null,
    author_id       uuid references users(id) on delete set null,
    status          post_status not null default 'draft',
    published_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TESTIMONIALS & CLIENTS STRIP
-- ----------------------------------------------------------------------------

create table testimonials (
    id              uuid primary key default uuid_generate_v4(),
    client_name     text not null,
    quote           text not null,
    rating          smallint check (rating between 1 and 5),
    avatar_url      text,
    is_featured     boolean not null default false,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now()
);

create table client_logos (
    id              uuid primary key default uuid_generate_v4(),
    name            text not null,
    logo_url        text not null,
    website_url     text,
    sort_order      int not null default 0
);

-- ----------------------------------------------------------------------------
-- SEO
-- ----------------------------------------------------------------------------

create table seo_metadata (
    id              uuid primary key default uuid_generate_v4(),
    page_path       text unique not null,      -- e.g. "/photography/editorial"
    title           text,
    description     text,
    og_image_url    text,
    json_ld         jsonb,
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ANALYTICS (lightweight, self-hosted)
-- ----------------------------------------------------------------------------

create table analytics_events (
    id              uuid primary key default uuid_generate_v4(),
    event_type      text not null,       -- e.g. "page_view", "gallery_view", "download"
    page_path       text,
    metadata        jsonb,
    created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SETTINGS (key/value store for site-wide config: theme, WhatsApp number, etc.)
-- ----------------------------------------------------------------------------

create table settings (
    id              uuid primary key default uuid_generate_v4(),
    key             text unique not null,
    value           jsonb not null,
    updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------

create index idx_albums_type on albums(type);
create index idx_albums_category on albums(category_id);
create index idx_media_assets_album on media_assets(album_id);
create index idx_gallery_access_album on gallery_access(album_id);
create index idx_bookings_status on bookings(status);
create index idx_blog_posts_status on blog_posts(status);
create index idx_analytics_events_type on analytics_events(event_type);
create index idx_analytics_events_created on analytics_events(created_at);
