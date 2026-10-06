-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0014 — Live Chat: AI auto-reply + human-handover flag
-- ═══════════════════════════════════════════════════════════════════════════
-- STATUS: NOT YET EXECUTED. Same convention as every prior migration here --
-- nothing runs until you paste it into the Supabase SQL editor yourself and
-- click Run.
--
-- WHY: the chat widget now tries to answer instantly using Cloudflare Workers
-- AI (env.AI -- already bound in this project's wrangler.toml, already used
-- for image alt-text + business-card scanning, so this is NOT a new paid
-- service or new account -- same free Cloudflare allowance as those two
-- existing features). Two small additive columns on the table from migration
-- 0013 let the CMS tell an AI reply apart from Naveed's own, and flag a
-- message the AI thinks needs Naveed personally.
--
-- SCOPE: additive only.
--   - is_ai      -- true only on an admin-sender row the AI generated.
--   - needs_human -- true on a VISITOR-sender row the AI couldn't fully
--     answer (pricing specifics, booking dates, complaints, or the visitor
--     asking for a real person) -- the CMS can highlight these.
--   Both default to false, so every existing row keeps working exactly as it
--     does today. No DROP, no ALTER ... existing column, no DELETE.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.live_chat_messages add column if not exists is_ai boolean not null default false;
alter table public.live_chat_messages add column if not exists needs_human boolean not null default false;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0014
-- ═══════════════════════════════════════════════════════════════════════════
