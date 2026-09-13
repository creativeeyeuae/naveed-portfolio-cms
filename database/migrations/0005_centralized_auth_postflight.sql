-- ═══════════════════════════════════════════════════════════════════════════
-- Post-migration verification for Migration 0005
-- ═══════════════════════════════════════════════════════════════════════════
-- READ-ONLY. Run this immediately AFTER 0005_centralized_auth.sql to confirm
-- the existing production admin account, and everything else already live,
-- is completely unaffected.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Same-or-higher auth.users row count vs. preflight's query 7.
select count(*) as auth_users_count_now from auth.users;

-- 2) The three new tables exist; empty except anyone who signed up in between.
select 'profiles' as table_name, count(*) from public.profiles
union all
select 'user_roles', count(*) from public.user_roles
union all
select 'staff_permissions', count(*) from public.staff_permissions;

-- 3) RLS is actually enabled on all three.
select relname, relrowsecurity
from pg_class
where relname in ('profiles', 'user_roles', 'staff_permissions');

-- 4) The booking system's tables are untouched -- same row counts as before.
select 'customers' as table_name, count(*) from public.customers
union all
select 'appointments', count(*) from public.appointments
union all
select 'payments', count(*) from public.payments
union all
select 'invoices', count(*) from public.invoices;

-- 5) Not a SQL check: after running the migration, log in to the CMS at
--    /?admin=1 with the real admin account and confirm it still works.
--    (This migration adds nothing that touches sign-in -- adminAuth.ts's
--    hardcoded ADMIN_EMAIL check is completely untouched -- but a real
--    login attempt is the only true proof.)
