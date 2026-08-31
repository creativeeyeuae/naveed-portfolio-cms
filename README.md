# naveed-portfolio-cms

A full-stack photography/cinematography portfolio CMS for Creative Fusion (Naveed Anjum).

## What's actually built here

This codebase is real and functional — not placeholders — for the core flows:

- **Database**: complete Postgres schema (`database/schema.sql`) + Prisma models (`backend/database/schema.prisma`) covering users, clients, taxonomy, albums, media, gallery access, bookings, blog, testimonials, SEO, analytics, and settings.
- **Backend API** (`backend/`): a Cloudflare Workers app (Hono) with working routes for albums, media upload, bookings, contact, testimonials, blog, SEO metadata, password-protected/client gallery access, and analytics — each with Zod validation and Supabase-JWT-based admin auth.
- **Frontend** (`frontend/`): a Next.js 15 App Router site — Home, Photography, Cinematography, About, Contact (with a working booking form wired to the API) — plus a protected `/admin` panel (login, dashboard, portfolio CRUD, bookings management, settings) gated by `middleware.ts` and Supabase Auth.
- **Admin UI modules** (`admin/`): the reusable admin components (album form/list, bookings table, settings form, stats cards) that the protected `/admin` pages import, matching the project structure you specified.

## What's intentionally simplified (and needs your attention before production)

Being straight about this rather than papering over it:

1. **Image variant generation**: on upload, `web` and `thumbnail` currently point at the same object as `original`. Real thumbnailing/optimization needs either Cloudflare Image Resizing (a paid Cloudflare feature) wired into the `media` route, or a separate resize step (e.g. a Worker Queue calling an image-processing service). The strict 2160×3240 / 3240×2160 ratio check also needs to happen client-side before upload (a Worker can't cheaply decode image bytes to verify pixel dimensions).
2. **Watermarking**: the schema supports a `watermarked_key` per asset, but no watermark-generation step is implemented yet — you'll want to decide the watermark design and where it's applied (upload-time vs. serve-time).
3. **Cross-folder imports**: the `/admin` pages in `frontend/app/admin/**` import components from the top-level `admin/` folder via relative paths (e.g. `../../../../admin/portfolio/AlbumList`). This works today but is fragile — for a real monorepo, wire this up as a proper pnpm/npm workspace (or just move `admin/` into `frontend/components/admin/`) so TypeScript path resolution isn't relying on relative traversal.
4. **Not yet built out**: dark mode toggle, multi-language (i18n) routing, PWA manifest/service worker, and the full analytics dashboard beyond the 4 basic counters shown. These are listed in your feature list but weren't part of the Phase 1–3 build sequence we agreed on — say the word and I'll add them next.
5. **Prisma on Cloudflare Workers**: this uses the `@prisma/adapter-pg` driver adapter pattern, which works but is newer/less battle-tested than Prisma on Node. If you hit issues, Prisma Accelerate (Prisma's own edge-compatible proxy) is the officially recommended alternative — swap `client.ts` to use `@prisma/extension-accelerate` instead of `adapter-pg`.

## Local development

```bash
# 1. Start local Postgres (optional — you can also point straight at Supabase)
cd docker && docker compose up -d

# 2. Backend
cd ../backend
cp .env.example .env      # fill in real values
npm install
npx prisma generate
npx prisma migrate deploy  # or: psql < ../database/schema.sql
npm run dev                 # runs on http://localhost:8787

# 3. Frontend (separate terminal)
cd ../frontend
cp .env.example .env.local  # fill in real values
npm install
npm run dev                 # runs on http://localhost:3000
```

## Deploying to production

You'll need accounts/credentials for: **Supabase**, **Cloudflare** (Workers + R2), and a place to host the frontend (Cloudflare Pages, as planned).

### 1. Supabase
- Create a project at supabase.com.
- Run `database/schema.sql` in the Supabase SQL editor (or via `psql`).
- Enable Email/Password auth under Authentication settings.
- Manually insert your own admin user's role: after signing up once via Supabase Auth, run:
  ```sql
  insert into users (auth_id, email, role) values ('<your-auth-uid>', 'you@example.com', 'admin');
  ```
- Copy your project URL, anon key, and service role key into the `.env` files.

### 2. Cloudflare R2
- Create a bucket named `naveed-portfolio-media` (or update `wrangler.toml`).
- Create an R2 API token (Account → R2 → Manage API tokens) for `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
- Set up a custom domain or `r2.dev` subdomain for public reads → this is your `R2_PUBLIC_URL`.

### 3. Backend → Cloudflare Workers
```bash
cd backend
npx wrangler login
npx wrangler secret put DATABASE_URL
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_PUBLIC_URL
npm run deploy
```
This gives you a live API URL like `https://naveed-portfolio-cms-api.<your-subdomain>.workers.dev`.

### 4. Frontend → Cloudflare Pages
- Connect your GitHub repo to Cloudflare Pages, or run `npx wrangler pages deploy` from `frontend/` after `npm run build`.
- Set the production environment variables (`NEXT_PUBLIC_API_URL` = your Workers URL, plus the Supabase ones) in the Pages project settings.
- Point your domain (e.g. `naveedanjum.com`) at the Pages project.

## Project structure
```
naveed-portfolio-cms/
├── frontend/     Next.js 15 app (public site + protected /admin routes)
├── backend/      Cloudflare Workers API (Hono + Prisma + R2)
├── admin/        Reusable admin UI modules imported by frontend/app/admin
├── database/     schema.sql (source of truth) + schema.prisma (mirror)
└── docker/       docker-compose.yml for local Postgres only
```
"# naveed-portfolio-cms" 
