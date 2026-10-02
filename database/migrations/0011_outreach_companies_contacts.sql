-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0011 — Outreach Companies + Contacts foundation
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Presented for review, same convention as every
-- prior migration in this folder -- nothing here runs until you explicitly
-- say to run it (paste into the Supabase SQL editor).
--
-- SCOPE: additive only. Creates 6 new tables. Touches no existing table.
--
-- WHY THESE ARE SEPARATE FROM THE EXISTING CRM:
--   The Creative Fusion CRM (public.customers, public.crm_tags,
--   public.customer_tags, public.crm_notes, public.crm_meetings,
--   public.crm_tasks) is Naveed's own booking-client relationship
--   management -- people who book/have booked a shoot. This migration is a
--   DIFFERENT, separate database: an outreach/communication contact list
--   (companies + people at those companies you want to reach out to via
--   WhatsApp/Email/etc, imported from Excel/CSV or scanned business cards).
--   Per instruction, it must not be mixed with the CRM, so nothing here
--   references customers/crm_tags/customer_tags, and none of those tables
--   are altered. Also checked and confirmed distinct from: public.clients
--   (the homepage "Our Clients" logo carousel), public.company_info
--   (per-booking billing/invoice info), and public.business_cards (an
--   existing, currently-unused table tied to customer_id -- left
--   completely untouched; this migration's own outreach_contacts.
--   card_image_url column covers the new Business Card Scanner instead).
--
--   - outreach_companies      -- one row per company in the outreach list.
--   - outreach_contacts       -- one row per person. Optional link to a
--     company (nullable, on delete set null -- deleting a company never
--     deletes its contacts, matching "one company can have multiple
--     contacts, do not create duplicate company records").
--   - outreach_tags           -- simple reusable tag names, shared by
--     companies and contacts (join tables below), independent of the
--     CRM's own crm_tags.
--   - outreach_company_tags / outreach_contact_tags -- join tables.
--   - outreach_segments       -- a saved filter (JSON) with a name, e.g.
--     "Dubai Real Estate Prospects", for later reuse by WhatsApp/Email
--     campaigns. Stores the filter only; it is not itself a campaign.
--
--   RLS enabled with ZERO policies (deny-all), identical pattern to every
--   other table in this project -- only the service-role Functions can
--   read/write. No existing table is altered, and the only foreign keys
--   are among these 6 new tables plus one nullable, non-cascading link
--   from outreach_contacts to outreach_companies.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.outreach_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  website text,
  email text,
  phone text,
  whatsapp text,
  country text,
  city text,
  address text,
  linkedin text,
  notes text,
  status text not null default 'prospect' check (status in ('prospect','contacted','interested','client','inactive')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outreach_companies_name on public.outreach_companies(name);
create index if not exists idx_outreach_companies_website on public.outreach_companies(website);
create index if not exists idx_outreach_companies_status on public.outreach_companies(status);

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.outreach_companies(id) on delete set null,
  first_name text,
  last_name text,
  full_name text,
  job_title text,
  email text,
  phone text,
  whatsapp text,
  website text,
  linkedin text,
  country text,
  city text,
  address text,
  notes text,
  card_image_url text,
  status text not null default 'prospect' check (status in ('prospect','contacted','interested','client','inactive')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outreach_contacts_company on public.outreach_contacts(company_id);
create index if not exists idx_outreach_contacts_email on public.outreach_contacts(email);
create index if not exists idx_outreach_contacts_phone on public.outreach_contacts(phone);
create index if not exists idx_outreach_contacts_whatsapp on public.outreach_contacts(whatsapp);

create table if not exists public.outreach_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_company_tags (
  company_id uuid not null references public.outreach_companies(id) on delete cascade,
  tag_id uuid not null references public.outreach_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, tag_id)
);

create table if not exists public.outreach_contact_tags (
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  tag_id uuid not null references public.outreach_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table if not exists public.outreach_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entity_type text not null check (entity_type in ('company','contact')),
  filters jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outreach_companies enable row level security;
alter table public.outreach_contacts enable row level security;
alter table public.outreach_tags enable row level security;
alter table public.outreach_company_tags enable row level security;
alter table public.outreach_contact_tags enable row level security;
alter table public.outreach_segments enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0011
-- ═══════════════════════════════════════════════════════════════════════════
