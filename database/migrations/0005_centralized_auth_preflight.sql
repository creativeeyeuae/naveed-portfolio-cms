-- ═══════════════════════════════════════════════════════════════════════════
-- Preflight check for Migration 0005 — Centralized Auth Foundation
-- ═══════════════════════════════════════════════════════════════════════════
-- READ-ONLY. Makes no changes. Run this FIRST, before the real migration file,
-- and read every row it returns. Per the locked rule "do not silently assume
-- objects do not already exist" — this is that check, made explicit and
-- inspectable rather than assumed.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- Expected result if the database is in the state the audit describes:
-- every one of the 7 queries below returns ZERO rows. If ANY query returns
-- a row, STOP — do not run the migration file — and share what came back.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Does the app_role enum type already exist?
select typname from pg_type where typname = 'app_role';

-- 2) Do any of the three new tables already exist (in any schema)?
select table_schema, table_name
from information_schema.tables
where table_name in ('profiles', 'user_roles', 'staff_permissions');

-- 3) Does a function named handle_new_user already exist? (A very common
--    Supabase tutorial name -- if this returns a row, do NOT let the
--    migration's CREATE OR REPLACE touch it silently; the hardened
--    migration below uses a distinct name specifically to avoid this.)
select n.nspname as schema, p.proname as function_name, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('handle_new_user', 'handle_new_user_centralized_auth');

-- 4) Does any trigger already exist on auth.users?
select tgname as trigger_name, tgrelid::regclass as table_name
from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- 5) Do any policies already exist on the three new table names?
select schemaname, tablename, policyname
from pg_policies
where tablename in ('profiles', 'user_roles', 'staff_permissions');

-- 6) Sanity check: confirm the column the later booking-linking phase
--    (Phase 7) depends on is still there, untouched, as expected.
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'customers' and column_name = 'auth_user_id';

-- 7) How many real auth.users rows exist right now (informational only).
select count(*) as current_auth_users_count from auth.users;
