-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0007 — Allow "Service Pages" CMS section to actually save
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED.
--
-- ROOT CAUSE (confirmed live, 2026-09-27): the CMS's "Service Pages" tab saves
-- to site_settings under key 'nap_service_pages'. Three RLS policies on that
-- table allow the anon role to insert/update ONLY a fixed list of key names,
-- and 'nap_service_pages' was never added to that list when the feature was
-- built. Every other CMS section (Settings/Projects/Categories/Testimonials/
-- Blog/Blog Categories) is on the list and saves fine; this one silently fails
-- every single time -- confirmed via pg_policies: no row yet exists for this
-- key, and both the insert and update policies' key allowlists omit it.
--
-- SCOPE: policy-only. No table structure, no data, changes.
--   - Widens 3 existing RLS policies' allowed-key list by exactly one entry
--     ('nap_service_pages'). Nothing else about them changes.
--   - Does not touch any row, column, table, or other policy.
--   - Fully reversible: rerunning with the old array values restores the
--     previous (buggy) behavior exactly.
-- ═══════════════════════════════════════════════════════════════════════════

alter policy cms_anon_insert_known_keys on public.site_settings
with check (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials',
  'nap_blog','nap_blogcats','nap_project_likes','nap_service_pages'
]::text[]));

alter policy cms_anon_update_known_keys on public.site_settings
using (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials',
  'nap_blog','nap_blogcats','nap_project_likes','nap_service_pages'
]::text[]))
with check (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials',
  'nap_blog','nap_blogcats','nap_project_likes','nap_service_pages'
]::text[]));

alter policy site_settings_insert_known_keys on public.site_settings
with check (key = ANY (ARRAY[
  'nap_settings','nap_projects','nap_cats','nap_testimonials','nap_blog',
  'nap_blogcats','nap_contact_submissions','nap_project_likes','nap_service_pages'
]::text[]));

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0007 -- NOT YET APPLIED
-- ═══════════════════════════════════════════════════════════════════════════
