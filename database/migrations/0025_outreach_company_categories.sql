-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0025 — Editable Company Categories (many-to-many)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run once in the Supabase SQL editor. Safe to run more than once.
--
-- SCOPE: additive only. Two new tables, nothing existing is altered or deleted.
--   - outreach_categories          -- the editable category list (rename / add / delete
--                                     from CMS > Companies > Manage categories).
--   - outreach_company_categories  -- join table: one company can be in several
--                                     categories. Deleting a category only removes the
--                                     links, never the companies.
--
-- Seeds the 9 starting categories, then pre-sorts existing companies into them by
-- matching keywords in their existing "industry" text (e.g. Lead Finder niche
-- "Interior design" -> Interior Design). Companies that match nothing stay
-- uncategorized; nothing is forced into "Other".
--
-- Same RLS pattern as every other table here: enabled, zero policies, so only the
-- service-role Pages Functions can read/write.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.outreach_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.outreach_company_categories (
  company_id uuid not null references public.outreach_companies(id) on delete cascade,
  category_id uuid not null references public.outreach_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, category_id)
);
create index if not exists idx_outreach_company_categories_category on public.outreach_company_categories(category_id);

alter table public.outreach_categories enable row level security;
alter table public.outreach_company_categories enable row level security;

insert into public.outreach_categories (name, sort_order) values
  ('Mobile & Telecom', 1),
  ('Interior Design', 2),
  ('Real Estate', 3),
  ('Hotels & Tourism', 4),
  ('E-commerce', 5),
  ('Restaurants', 6),
  ('Healthcare', 7),
  ('Education', 8),
  ('Other', 9)
on conflict (name) do nothing;

-- Pre-sort existing companies by their industry text (a company can match several).
insert into public.outreach_company_categories (company_id, category_id)
select c.id, k.id
from public.outreach_companies c
join public.outreach_categories k on (
     (k.name = 'Mobile & Telecom' and c.industry ~* '(mobile|telecom|phone|cellular)')
  or (k.name = 'Interior Design'  and c.industry ~* '(interior|fit.?out|furniture|decor|architect)')
  or (k.name = 'Real Estate'      and c.industry ~* '(real.?estate|realty|propert|broker|developer)')
  or (k.name = 'Hotels & Tourism' and c.industry ~* '(hotel|resort|touris|travel|hospitality)')
  or (k.name = 'E-commerce'       and c.industry ~* '(e.?commerce|online (store|shop)|marketplace)')
  or (k.name = 'Restaurants'      and c.industry ~* '(restaurant|caf[eé]|dining|f ?& ?b|food|catering|bakery)')
  or (k.name = 'Healthcare'       and c.industry ~* '(health|clinic|hospital|medical|dental|pharma)')
  or (k.name = 'Education'        and c.industry ~* '(educat|school|universit|college|academy|training)')
)
where c.industry is not null
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0025
-- ═══════════════════════════════════════════════════════════════════════════
