-- 0022_coupons.sql — discount / coupon codes for website bookings.
-- Private table: RLS ON with NO policies, so the public site key can neither read nor write it.
-- Only Cloudflare Pages Functions (service-role key) touch it:
--   /api/bookings/coupon  (check a code for a package)  /api/bookings/create (apply + count use)
--   /api/admin/coupons    (CMS: generate / list / pause / delete)
create table if not exists public.coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code = upper(code) and length(code) between 3 and 40),
  kind        text not null default 'percent' check (kind in ('percent','fixed')),
  value       numeric(12,2) not null check (value > 0),
  max_uses    integer check (max_uses is null or max_uses > 0),
  used_count  integer not null default 0 check (used_count >= 0),
  min_amount  numeric(12,2),
  expires_at  timestamptz,
  active      boolean not null default true,
  note        text,
  created_by  text,
  created_at  timestamptz not null default now(),
  constraint coupons_percent_max check (kind <> 'percent' or value <= 100)
);
alter table public.coupons enable row level security;
-- intentionally no policies (server-only table)
