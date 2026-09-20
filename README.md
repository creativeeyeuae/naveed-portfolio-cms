# Naveed Anjum Portfolio CMS — bynaveedanjum.com

A single Next.js 15 (App Router) application that is simultaneously the public
site, the admin CMS, and the client portal. There is no separate backend
service in production — Supabase and Cloudflare Pages Functions are the
entire server side.

## Live architecture

**Frontend** (`frontend/`) — Next.js 15, static export (`output: "export"`),
deployed to Cloudflare Pages.

- The homepage (`/`) is a client-side SPA: it fetches settings/projects from
  Supabase on load and renders instantly, including the embedded admin CMS
  (`app/page.tsx`, gated behind `?admin=1`).
- Every other route (`/work`, `/about`, `/packages`, `/gear`, `/contact`,
  `/photography`, `/cinematography`, the SEO service pages, etc.) is a real
  static route built at **build time** from `lib/cmsData.ts`
  (`getPublicSiteInfo()` / `getRealProjects()`). A CMS save only appears on
  these routes after the next rebuild+deploy.

**Backend** — Cloudflare Pages Functions, `frontend/functions/api/`:
- Visitor-facing: `comments`, `likes`, `google-reviews`, `permission-requests`,
  `visitor/identify`, `visitor/me` (anonymous, signed-cookie visitor identity —
  no password, no account).
- Admin-facing: `admin/comments`, `admin/bookings`, `admin/messages`,
  `admin/permission-requests`, `admin/payments/[id]/approve|reject`,
  `admin/push/subscribe|unsubscribe`, `admin/seo/*`.
- Client-facing: `client/bookings`, `client/messages`, `client/receipt-upload`.
- `notify/trigger`.
- Auth for these: `functions/_shared/adminAuth.ts` (Supabase service role) or
  `functions/_shared/visitorAuth.ts` (signed cookie).

**Database**: Supabase Postgres. `database/migrations/` holds the real, applied
SQL migrations for the live schema — most importantly `0005_centralized_auth`
(the `user_roles` table) and `0006_client_messages`. This is the one real
database for the project; there is no second one.

**Auth** — one centralized system, `frontend/lib/authClient.ts`:
- `/login` (Client / Admin tabs) → Supabase Auth email+password.
- Client sign-in → `/client` (bookings, payments, messages).
- Admin sign-in is checked against `user_roles`, then redirected into the CMS.
- The embedded CMS gate (`app/page.tsx`, `?admin=1`) redirects any
  unauthenticated visitor straight to `/login?tab=admin` — it does not have
  its own separate sign-in form anymore.
- `/register`, `/reset-password`, `/reset-password/update`, `/verify-email`
  round out the flow. Registration never accepts a role; new accounts default
  to `client` via a database trigger.

**Deployment**:
- Manual: `cd frontend && npm run build && npx wrangler pages deploy out --project-name=naveed-portfolio-cms --branch=main`.
- Automatic: `.github/workflows/auto-publish.yml` polls the Supabase content
  hash and rebuilds+redeploys when it changes (so CMS-only content generally
  goes live without a manual deploy, on a delay).

## What used to be here

Earlier in this project's history a second backend (Hono + Prisma + Postgres +
Cloudflare R2, at `backend/`) and a matching standalone admin panel (`admin/`)
were scaffolded but never deployed — the actual product shipped as the single
Next.js app described above instead. Those folders, an unused `database/schema.prisma`
/ `schema.sql` pair from the same abandoned design, a dead `frontend/middleware.ts`
(Next middleware doesn't run under static export), and a local-Postgres-only
`docker/docker-compose.yml` have been removed. `database/migrations/` was kept
because it documents the real, currently-applied Supabase schema.
