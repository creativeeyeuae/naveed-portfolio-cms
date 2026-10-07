-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0015 — Live Chat human takeover flag
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Same convention as every prior migration in this folder --
-- paste into the Supabase SQL editor (or `psql ... -f`) to run it.
--
-- WHY ON visitors, NOT live_chat_messages: "take over" is a state of the whole
-- conversation ("Naveed is handling this visitor personally right now"), not a property
-- of one message -- so it belongs on the visitor's own row (migration 0004), one flag per
-- thread. functions/api/visitor/chat.ts checks it before calling the AI; functions/api/
-- admin/livechat.ts flips it from a button in the CMS Live Chat panel.
--
-- SCOPE: additive only -- one new column, default false, on an existing table. No DROP,
-- no DELETE, no data migration. Every visitor row that already exists gets ai_paused=false
-- automatically (the column default), i.e. "AI stays on" for every existing thread.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.visitors add column if not exists ai_paused boolean not null default false;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0015
-- ═══════════════════════════════════════════════════════════════════════════
