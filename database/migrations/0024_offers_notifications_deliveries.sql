-- 0024_offers_notifications_deliveries.sql
-- Offer banners (portal/app/website), client notifications (portal bell), file deliveries
-- (Google Drive link per booking). Server-only tables: RLS ON, NO policies.

create table if not exists public.offer_banners (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subtitle     text,
  coupon_code  text,
  cta_label    text default 'Book now',
  cta_link     text default '/booking',
  image_url    text,
  overlay_color text default '#1B0F33',
  overlay_opacity integer not null default 55 check (overlay_opacity between 0 and 95),
  show_portal  boolean not null default true,
  show_website boolean not null default false,
  starts_at    timestamptz,
  ends_at      timestamptz,
  active       boolean not null default true,
  views        integer not null default 0,
  clicks       integer not null default 0,
  created_by   text,
  created_at   timestamptz not null default now()
);
alter table public.offer_banners enable row level security;

-- customer_id NULL = sent to every client.
create table if not exists public.client_notifications (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.customers(id) on delete cascade,
  title        text not null,
  body         text,
  link         text,
  read_by      uuid[] not null default '{}',
  created_by   text,
  created_at   timestamptz not null default now()
);
create index if not exists client_notifications_cust_idx on public.client_notifications(customer_id, created_at desc);
alter table public.client_notifications enable row level security;

create table if not exists public.booking_deliveries (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  link           text not null,
  photos         integer,
  videos         integer,
  expires_at     timestamptz,
  note           text,
  sent_email     boolean not null default false,
  sent_whatsapp  boolean not null default false,
  created_by     text,
  created_at     timestamptz not null default now()
);
create index if not exists booking_deliveries_cust_idx on public.booking_deliveries(customer_id, created_at desc);
alter table public.booking_deliveries enable row level security;
