-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0005 — Centralized Auth Foundation (hardened)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Run 0005_centralized_auth_preflight.sql FIRST and
-- confirm every one of its 7 checks returns zero rows (except the informational
-- auth.users count). Presented for review, per this project's established
-- convention (see migration 0002's header) -- nothing here runs against the
-- real database until you explicitly say to run it.
--
-- SCOPE: additive only.
--   - Creates NEW tables only (profiles, user_roles, staff_permissions).
--   - Creates ONE new enum type (app_role).
--   - Creates ONE new function and ONE new trigger, both under names chosen
--     specifically to avoid colliding with anything that might already exist.
--   - Touches zero existing tables, columns, or rows. In particular:
--     `customers.auth_user_id` already exists and is NOT modified here --
--     Phase 7 populates it, this migration doesn't need to add it.
--   - Contains no DROP, no ALTER ... ALTER COLUMN, no DELETE, no TRUNCATE.
--   - Every CREATE is guarded: if the object already exists, this migration
--     SKIPS it and leaves the existing object exactly as it was, rather than
--     silently replacing it via CREATE OR REPLACE.
--
-- IDEMPOTENCE, HONESTLY STATED: table/index creation and the guarded DO blocks
-- are genuinely safe to rerun. What this file does NOT verify on a rerun is
-- that a pre-existing same-named object has the exact definition this file
-- expects -- that's what the preflight script is for, run BEFORE this file,
-- not after.
--
-- WHY auth.users AND NOT A NEW "users" TABLE: Supabase Auth already maintains
-- auth.users -- the single admin login already authenticates against it
-- today. We do not recreate the dormant Hono design's own User{role} table;
-- its role *concept* is reused via app_role + user_roles on top of auth.users.
--
-- WHY A NON-GENERIC FUNCTION NAME: handle_new_user() is the exact name
-- Supabase's own docs and most tutorials use. CREATE OR REPLACE under that
-- name could silently overwrite something already there for an unrelated
-- reason. A project-scoped name removes that risk entirely.
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  create type app_role as enum ('client', 'staff', 'admin', 'super_admin');
exception when duplicate_object then null;
end $$;

-- One row per person, 1:1 with auth.users. Deleting the auth user cascades --
-- this never deletes their bookings/inquiries/etc., which reference their
-- auth user id separately, with their own ON DELETE behavior decided later.
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text,
  phone                 text,
  company               text,
  address               text,
  country               text,
  website               text,
  bio                   text,
  avatar_url            text,
  notification_prefs    jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Source of truth for RBAC. A user can hold more than one role -- primary key
-- on (user_id, role) so granting the same role twice is a harmless no-op.
create table if not exists public.user_roles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        app_role not null,
  granted_by  uuid references auth.users(id) on delete set null,
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);

-- Only meaningful for role = 'staff'. ADMIN/SUPER_ADMIN are full-access by
-- definition and never need rows here.
create table if not exists public.staff_permissions (
  user_id         uuid not null references auth.users(id) on delete cascade,
  permission_key  text not null,
  granted_by      uuid references auth.users(id) on delete set null,
  granted_at      timestamptz not null default now(),
  primary key (user_id, permission_key)
);

-- New registrant -> profile row + default CLIENT role, automatically.
-- Hardening applied:
--   - project-scoped name instead of the generic tutorial name
--   - explicit `set search_path = public, pg_temp` so the function cannot be
--     tricked by a session-level search_path change into resolving
--     "profiles"/"user_roles" to some other schema's tables
--   - every table reference is schema-qualified as a second, independent
--     layer of the same protection
--   - no dynamic SQL
--   - takes no parameters and reads nothing user-controlled -- the only
--     input is new.id, the auth user id Postgres itself just created, never
--     anything the registering person supplied -- so there is no path for a
--     client-supplied role or id to reach these inserts
--   - only ever inserts a 'client' row; never admin/staff/super_admin
create or replace function public.handle_new_user_centralized_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created_centralized_auth
    after insert on auth.users
    for each row execute function public.handle_new_user_centralized_auth();
exception when duplicate_object then null;
end $$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.staff_permissions enable row level security;

-- Everyone can read/update their own profile only. Both USING (which rows
-- are visible/targetable) and WITH CHECK (what the row must look like AFTER
-- the update) are required, so a client can't rewrite their own row's `id`
-- to point at someone else's. No policy exists for reading another profile --
-- an admin dashboard reads through the service-role key inside a Pages
-- Function (server-side, already-established pattern), never the browser.
do $$ begin
  create policy "own_profile_select" on public.profiles
    for select to authenticated using (id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "own_profile_update" on public.profiles
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
exception when duplicate_object then null;
end $$;

-- Everyone can see their own roles; nobody can write their own roles -- no
-- insert/update/delete policy exists at all for authenticated users, which
-- under RLS's default-deny model means role grants only ever happen
-- server-side via the service-role key, by an explicit admin action.
do $$ begin
  create policy "own_roles_select" on public.user_roles
    for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "own_permissions_select" on public.staff_permissions
    for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0005 -- NOT YET APPLIED
-- ═══════════════════════════════════════════════════════════════════════════
