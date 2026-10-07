-- Migration 0017: Fix RLS policy allowlist gap blocking contact form saves
--
-- ROOT CAUSE:
-- Three RLS policies on public.site_settings gate which `key` values the
-- anonymous (public, unauthenticated) role may INSERT/UPDATE, using a fixed
-- array allowlist:
--   - cms_anon_insert_known_keys   (INSERT)
--   - cms_anon_update_known_keys   (UPDATE)
--   - site_settings_insert_known_keys (INSERT)
--
-- 'nap_contact_submissions' (the key the public Contact form writes leads
-- into) was present in site_settings_insert_known_keys but MISSING from
-- cms_anon_insert_known_keys and cms_anon_update_known_keys. Because Postgres
-- combines multiple PERMISSIVE policies for the same command with OR, having
-- it in just one policy is not guaranteed to be sufficient on every
-- Supabase/PostgREST configuration, and in this project's live behavior the
-- write was being silently rejected -- confirmed live: 0 rows have ever been
-- saved under this key despite real visitor submissions.
--
-- This migration is additive-only: it REPLACES only the allowed-key array for
-- these three existing policies, adding 'nap_contact_submissions' (and also
-- 'nap_service_pages', which migration 0007 already documented as missing
-- from the same two policies but which was never executed in production).
-- No table, column, row, or other policy is touched. No existing allowed key
-- is removed.
--
-- STATUS: NOT YET EXECUTED as of 2026-10-07. Run this directly in the
-- Supabase SQL editor for the project (same place migration 0007 would have
-- been run).

alter policy cms_anon_insert_known_keys on public.site_settings
with check (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials',
  'nap_blog','nap_blogcats','nap_project_likes','nap_service_pages',
  'nap_contact_submissions'
]::text[]));

alter policy cms_anon_update_known_keys on public.site_settings
using (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials',
  'nap_blog','nap_blogcats','nap_project_likes','nap_service_pages',
  'nap_contact_submissions'
]::text[]))
with check (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials',
  'nap_blog','nap_blogcats','nap_project_likes','nap_service_pages',
  'nap_contact_submissions'
]::text[]));

alter policy site_settings_insert_known_keys on public.site_settings
with check (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials','nap_blog',
  'nap_blogcats','nap_contact_submissions','nap_project_likes','nap_service_pages'
]::text[]));
