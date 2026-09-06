# Future Architecture Modules (NOT implemented — planning only)

Status: documented for future build. Nothing in this file is connected, authorized to run,
or implemented in the current Phase 2 work. No OAuth apps, credentials, or social accounts
are configured. This is a design placeholder so future work has an agreed shape to build
toward, per explicit instruction to document but not implement.

---

## Module A — Social Media & Campaign Agent (future)

**Purpose:** let approved portfolio content be turned into platform-ready campaign posts,
scheduled and tracked, with a mandatory human approval gate before anything publishes.

**Supported platforms (where each platform's official API/OAuth supports it):**
Instagram, Facebook, LinkedIn, YouTube — others addable later behind the same pattern.

**Hard rules carried into any future implementation:**
- No platform passwords are ever requested or stored. Connection is OAuth/official-API only.
- Connected account tokens are stored encrypted at rest and must be revocable per-account,
  per-platform, at any time, without contacting the platform's support.
- Nothing publishes automatically. Every piece of content requires an explicit human
  approval step before it is scheduled or sent.
- Content flagged as sensitive, controversial, financial, legal, or client-confidential is
  blocked from auto-publish regardless of approval-queue state, and always requires a human
  to explicitly clear that flag.

**Workflow (future):**
CMS portfolio project → select approved photos/videos → AI drafts campaign content
(platform-specific captions, hashtags/keywords, a short-video/reel content plan) →
content calendar → human approval → scheduled publishing → performance tracking →
campaign analysis → recommendations for next content.

**Indicative data model (future — none of this exists yet):**
- `social_accounts` — platform, external_account_id, oauth_access_token (encrypted),
  oauth_refresh_token (encrypted), scopes_granted, connected_at, revoked_at, connected_by.
- `campaigns` — name, objective, target_audience, status, created_by, created_at.
- `campaign_content` — campaign_id, source_album_id / source_media_id (FK into the
  existing portfolio tables), platform, content_type (post/reel/short/story), caption,
  hashtags, scheduled_at, published_at, status (draft / pending_approval / approved /
  scheduled / published / failed / blocked_sensitive).
- `campaign_approvals` — content_id, approved_by, approved_at, notes.
- `campaign_performance` — content_id, platform, metrics (JSON), fetched_at.

**Indicative API surface (future):** per-platform OAuth connect/callback/revoke endpoints;
campaign CRUD; an AI-draft-content endpoint that only ever produces a `draft`/
`pending_approval` row; an approve endpoint (human-only, authenticated); a scheduler that
only acts on `approved` rows; a performance-sync job per platform.

**Fields the owner picks in the future UI, per piece of content:** platform, campaign,
source project, content type, publish date/time, caption, media (selected from the
project's already-approved photos/videos), campaign objective, target audience. These map
directly onto the `campaign_content`/`campaigns` columns above.

---

## Module B — AI Client Communication Agent (future)

**Purpose:** let routine lead intake and scheduling be handled by an assistant, with a
clear, rule-based escalation path to a human whenever the conversation goes outside what
the agent should decide on its own.

**Workflow (future):**
Lead → AI understands the inquiry → asks the required qualifying questions → checks
availability → proposes booking times → Google Calendar → confirmation → WhatsApp/email →
follow-up → CRM update → human escalation when necessary.

**Hard rules carried into any future implementation:**
- The agent proposes; it does not have unilateral authority to finalize anything the rules
  mark as requiring a human (pricing exceptions, disputes, anything the lead frames as
  urgent/upset, anything ambiguous about scope).
- Every automated step is logged against the lead/CRM record so a human can review the
  full exchange at any time.
- Escalation is rule-based and always available as a fallback, not just an edge case.

**Indicative data model (future):** extends the existing `app_bookings` / `crm_clients`
tables (from the approved Phase 2 schema) with `agent_conversations` (lead/client ref,
channel, transcript/thread reference, status) and `agent_escalations` (conversation_id,
reason, escalated_at, resolved_by).

**Indicative integrations (future):** Google Calendar API (OAuth), the existing
WhatsApp/email contact channels, CRM update via the existing `crm_clients`/`app_bookings`
tables — no new channel is introduced without the same OAuth-only, human-approval-gated
pattern as Module A.

---

Both modules are explicitly out of scope for the current Phase 2 CMS/portfolio
implementation and require their own separate approval pass — architecture review,
security review (OAuth token storage, scopes, revocation), and cost review (any paid API
tiers) — before any code is written against them.
