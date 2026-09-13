# Project Memory — naveed-portfolio-cms (bynaveedanjum.com)

Maintained per the local+live-production-engineer workflow. Read this first each session.

## Current system state (as of 2026-09-13)

- Repo root: `naveed-portfolio-cms/naveed-portfolio-cms/` (note the doubled folder name on disk).
- Frontend: Next.js 15 App Router, static export (`output:"export"`), deployed to Cloudflare
  Pages. The homepage (`app/page.tsx`, ~4300 lines) is a single-page-app, but its Nav/Footer
  are no longer inline/private -- see "Recent changes" below. `/work/[slug]` uses the exact
  same shared components.
- `git status`: local `main` is still ahead of `origin/main` and has NOT been pushed. Nothing
  described below is live in production yet -- last confirmed by fetching the real
  `bynaveedanjum.com/work/bridal-portraits/` page, which still showed the old broken header.
- Migration `0005` (`profiles`/`user_roles`/`staff_permissions`) is drafted, hardened, and
  committed but **not yet applied** to the live Supabase database. Waiting on the user to run
  pre/migration/post SQL in the Supabase dashboard themselves (no service-role credential
  exists locally).
- Phase 5 (centralized auth pages: `/login /register /reset-password /verify-email`,
  `lib/authClient.ts`, `functions/_shared/auth.ts` + `authorize.ts`) is written and still
  **untracked** in git (not yet committed) -- untouched by the work below.

## Recent changes (this session -- Phase B: real shared Header/Footer)

The prior session's fix (see git history / below) ported the homepage's Nav/Footer *markup*
into standalone `components/work/SiteHeader.tsx`/`SiteFooter.tsx` for `/work/[slug]` only --
a synced-but-separate mirror. The user explicitly rejected that architecture: *"The
individual project/detail pages must NOT have their own newly created Header, Footer... Fix
the individual project pages so they use the SAME existing components and implementation as
the rest of the website."* Investigation confirmed no shared component existed anywhere
before this -- the homepage's Nav/Footer were unexported consts *inside* `Home()`. The user
chose (via explicit decision): **extract them into one real shared component.**

**What changed:**
- `frontend/components/SiteHeader.tsx` (NEW, top-level) -- the one real header. Dual-mode:
  `spa` prop (supplied only by the homepage) renders the exact original fixed/scroll-hiding
  nav + mobile hamburger + language switcher, reading from live Home() state instead of
  closures; no `spa` prop (every other route) renders a static real-`<a href>` version with
  its own tiny language-selector state. Every style value byte-matches the original inline
  Nav (verified against `app/page.tsx` line-by-line during extraction).
- `frontend/components/SiteFooter.tsx` (NEW, top-level) -- same dual-mode pattern. `spa`
  prop is just `{ goTo }`; Quick Links labels arrive pre-translated from the homepage (this
  component has no i18n logic of its own). Corrected two fidelity bugs inherited from the
  old `work/SiteFooter.tsx` mirror before wiring it into the homepage: heading/link colors
  now use the same `--c-*` CSS-variable tokens as `app/page.tsx`'s own `C` object (was
  wrongly using different variable names), and the content grid's padding/gap now match the
  original (`48px 40px 24px` / `gap:40`, was `24px`/`32`).
- `frontend/app/page.tsx` -- `const Nav=()=>(...)` and `const Footer=()=>(...)` (previously
  ~180 lines of inline JSX) replaced with thin adapters rendering `<SiteHeader site={site}
  spa={{...}}/>` and `<SiteFooter site={site} spa={{goTo}}/>`. A new `const site:
  PublicSiteInfo = {...}` builds the shared props object from `settings` (translating
  `footerLinks` via the existing `PAGE_LABEL_KEY`+`T`+`lang` pattern). The PWA
  install-banner block and the `@keyframes clientsOrbit`/`pgFadeIn` `<style>` tag were
  preserved -- the banner renders inline in `Home()` right after `<SiteHeader/>` (unchanged
  behavior/position); the keyframes now ship inside `SiteHeader.tsx`'s `spa` branch instead
  (still present on every homepage view, since `<Nav/>`/`SiteHeader` renders on all of them).
  **Zero call sites changed** -- all ~10 `<Nav/>`/`<Footer/>` usages throughout `Home()`'s
  return statement are untouched; only the two const *definitions* changed. Extraction was
  done programmatically (a throwaway Node script doing balanced-paren matching on unique
  `// ── NAV ──`/`// ── FOOTER ──`/`// ── CMS ──` comment markers), not by hand-retyping the
  JSX, specifically to avoid transcription mistakes in a live revenue file.
- `frontend/app/work/[slug]/page.tsx` -- import paths updated from
  `@/components/work/SiteHeader`/`SiteFooter` to `@/components/SiteHeader`/`SiteFooter`.
  Usage (`<SiteHeader site={site}/>`) unchanged -- the static (no-`spa`) branch is a drop-in
  match.
- `frontend/components/work/SiteHeader.tsx` / `SiteFooter.tsx` -- **deleted**. Leaving them
  next to the new shared components would itself have been the duplicate-implementation the
  user explicitly rejected.
- `frontend/lib/cmsData.ts` -- unchanged this session (already extended in the prior
  session with everything `PublicSiteInfo` needs; reused as-is).

## Verified functionality

- `npx tsc --version` confirms the compiler runs (5.9.3); `npx tsc --noEmit` -- **pass**,
  zero output/errors.
- `npm run build` (after clearing `.next`) -- **pass**, all 35 routes generated, including
  the homepage and all 3 real `/work/[slug]` pages (`world-investment-conference-wic-2025`,
  `bridal-portraits`, `corporate-excellence`).
- Static export spot-checked directly: both `out/index.html` (homepage) and
  `out/work/bridal-portraits.html` contain "Book a Project", "Journal", "Admin", "Quick
  Links", "Services", "Follow", "WhatsApp" -- confirming the same real header/footer content
  is baked into both, not just present in source.
- `git status` after the change shows exactly the expected file set (page.tsx modified,
  work/[slug]/page.tsx modified, work/SiteHeader.tsx+SiteFooter.tsx deleted, two new
  top-level component files untracked) -- no unintended files touched.
- NOT YET verified in a real browser / visually (no browser available in this environment).
  The homepage is the live revenue page -- a manual visual pass (scroll behavior, mobile
  hamburger menu, language switcher, "Our Clients" orbit animation still spinning) is
  strongly recommended before pushing, in addition to production verification after deploy.

## Unresolved / pending

- Nothing from this or the prior session has been **committed or pushed** yet. Needs the
  user's go-ahead, since pushing also publishes other already-committed-but-unpushed commits.
- Migration 0005 still needs the user to run it manually in the Supabase SQL editor.
- Phase 5 auth files are still untracked in git.
- A real-browser visual pass on the homepage (see above) has not been done yet.

## Configuration requirements (names only, never values)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- present in `frontend/.env.local`.
- `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL` -- Cloudflare Pages secrets only, not present
  locally (by design).

## Failed approaches (don't repeat)

- Do NOT recreate a separate/mirrored Header or Footer for any single route (the old
  `components/work/SiteHeader.tsx`/`SiteFooter.tsx` mistake, twice now flagged by the user).
  There is exactly one Header and one Footer (`frontend/components/SiteHeader.tsx` /
  `SiteFooter.tsx`), dual-mode (`spa` prop vs static), used by every route. If a future page
  needs the site chrome, import these -- never write new nav/footer markup.
- The old note here claiming "the homepage's Nav/Footer can't be extracted without a much
  larger refactor" was WRONG and has been corrected by this session's work -- the extraction
  was a contained, mechanical change (new files + two const bodies swapped for adapters,
  zero call sites touched). Do not resurrect that old claim.
