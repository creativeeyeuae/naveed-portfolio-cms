-- Migration 0021: CreativeBot works even when Cloudflare is unavailable
--
-- 1) Public, read-only access to ACTIVE chatbot FAQs. These answers are shown to any
--    visitor anyway, so letting the site's public key read them is safe -- it lets the chat
--    widget answer from FAQs directly from the database when the Cloudflare API is down.
--    Inactive FAQs stay hidden; nobody but the server can insert/update/delete.
-- 2) live_chat_offline_messages: an INSERT-ONLY drop box for messages sent while the
--    Cloudflare API is down. Visitors can add a row but can never read, change or delete
--    any row (no select/update/delete policy). Naveed reads them in the CMS through the
--    server (service role), which bypasses RLS. Length checks stop abuse/oversized rows.
--
-- Run this once in the Supabase SQL editor. Safe to re-run.

drop policy if exists "Public can read active chat FAQs" on public.chat_faqs;
create policy "Public can read active chat FAQs"
  on public.chat_faqs for select
  to anon, authenticated
  using (is_active = true);

create table if not exists public.live_chat_offline_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  contact text not null check (char_length(contact) between 3 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  page text check (page is null or char_length(page) <= 300),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.live_chat_offline_messages enable row level security;

drop policy if exists "Anyone can leave an offline chat message" on public.live_chat_offline_messages;
create policy "Anyone can leave an offline chat message"
  on public.live_chat_offline_messages for insert
  to anon, authenticated
  with check (handled = false);

create index if not exists live_chat_offline_messages_created_idx
  on public.live_chat_offline_messages (created_at desc);
