-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0016 — Chatbot knowledge base (Q&A pairs for Live Chat's AI)
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Same convention as every prior migration -- paste into the
-- Supabase SQL editor (or `psql ... -f`) to run it.
--
-- WHAT THIS IS: a simple list of question/answer pairs Naveed types in himself from the
-- CMS (new "Chatbot Q&A" panel, next to Live Chat). The Live Chat AI (functions/api/
-- visitor/chat.ts, loadGroundingContext()) reads every is_active=true row here and adds it
-- to the same "facts" block it already builds from nap_settings (services/pricing/
-- location) -- so a visitor asking something Naveed has pre-answered here gets that exact
-- answer instead of the model guessing or deflecting to "Naveed will follow up".
--
-- SCOPE: additive only -- one new table. No DROP, no DELETE, no ALTER on any existing
-- table. RLS enabled, ZERO policies (deny-all for anon/authenticated) -- identical pattern
-- to every other CMS-managed table in this project; only admin-auth-gated Functions using
-- the service-role key read/write it (functions/api/admin/chat-faqs.ts), and the visitor-
-- facing AI reads it through the same service-role path (functions/api/visitor/chat.ts).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.chat_faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_chat_faqs_active_order on public.chat_faqs(is_active, sort_order);

alter table public.chat_faqs enable row level security;
-- No policies attached -- deny-all for anon/authenticated by design (see header above).

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0016
-- ═══════════════════════════════════════════════════════════════════════════
