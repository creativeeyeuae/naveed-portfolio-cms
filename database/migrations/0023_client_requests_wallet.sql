-- 0023_client_requests_wallet.sql
-- Client cancel / reschedule requests (approved by admin) + wallet credit ledger.
-- Both are server-only tables: RLS ON with NO policies. Only Pages Functions (service role)
-- read/write them, always scoped to the signed-in client or an authenticated admin.

create table if not exists public.booking_requests (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  kind           text not null check (kind in ('cancel','reschedule')),
  new_date       date,
  new_time       time,
  reason         text,
  fee_percent    numeric(5,2) not null default 0,
  status         text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  admin_note     text,
  decided_by     text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists booking_requests_status_idx on public.booking_requests(status, created_at desc);
create index if not exists booking_requests_customer_idx on public.booking_requests(customer_id, created_at desc);
alter table public.booking_requests enable row level security;

-- Wallet = append-only ledger. Balance = sum(amount). Positive = credit, negative = spent.
create table if not exists public.wallet_transactions (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  amount         numeric(12,2) not null check (amount <> 0),
  currency       text not null default 'AED',
  kind           text not null check (kind in ('credit','refund','gift','debit','adjustment')),
  note           text,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_by     text,
  created_at     timestamptz not null default now()
);
create index if not exists wallet_tx_customer_idx on public.wallet_transactions(customer_id, created_at desc);
alter table public.wallet_transactions enable row level security;
