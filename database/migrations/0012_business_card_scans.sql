-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0012 — Business card scans (Part 3)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Presented for review, same convention as every
-- prior migration in this folder -- nothing here runs until you explicitly
-- say to run it (paste into the Supabase SQL editor).
--
-- SCOPE: additive only. Creates 1 new table. Touches no existing table,
-- including outreach_contacts / outreach_companies from migration 0011.
--
-- DEPENDENCY: this table's two foreign keys reference outreach_contacts(id),
-- which migration 0011 creates. This migration must run AFTER 0011. If 0011
-- has not been run yet, running this one will fail (the referenced table
-- won't exist) -- that is expected, not a bug in this file.
--
-- WHY A SEPARATE TABLE, NOT MORE COLUMNS ON outreach_contacts:
--   A business-card scan and a CRM contact are different things with
--   different lifecycles. A scan can be captured, fail to extract, get
--   rejected on review, or turn into a brand-new contact, or get matched
--   to one that already exists -- all before (or instead of) any contact
--   row ever being touched. Recording that lifecycle as columns on
--   outreach_contacts would mean a contact row for every attempted scan,
--   including rejected/failed ones, and would block admins from reviewing
--   their own scan history independent of what they decided to do with it.
--   This table stands next to outreach_contacts (nullable, on-delete-set-
--   null links in both directions) rather than inside it.
--
--   The scanned image itself is still stored as the base64 string the
--   camera/upload already produces (card_image column below) -- exactly
--   today's existing behavior for business-card images, just moved from
--   outreach_contacts.card_image_url into this table's own column instead
--   of duplicating it. Moving this to real object storage (Supabase
--   Storage, matching the existing "receipts"/"portfolio" bucket pattern
--   elsewhere in this codebase) is a separate, later phase -- this
--   migration does not attempt it, per the "no large storage migration
--   this phase" instruction it was built against.
--
create table if not exists public.business_card_scans (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'captured'
    check (status in ('captured','processing','extracted','reviewed','rejected','converted')),
  card_image text,
  raw_text text,
  extracted jsonb not null default '{}'::jsonb,
  review_state text not null default 'needs_review'
    check (review_state in ('high_confidence','needs_review','uncertain')),
  detected_language text,
  provider text,
  error text,
  matched_contact_id uuid references public.outreach_contacts(id) on delete set null,
  created_contact_id uuid references public.outreach_contacts(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_business_card_scans_status on public.business_card_scans(status);
create index if not exists idx_business_card_scans_created_contact on public.business_card_scans(created_contact_id);

alter table public.business_card_scans enable row level security;
-- Zero policies (deny-all), identical pattern to every outreach_* table in
-- migration 0011 -- only the service-role Functions can read/write.

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0012
-- ═══════════════════════════════════════════════════════════════════════════
