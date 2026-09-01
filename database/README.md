# Database — Phase 1 Foundation

## Files
- `schema.sql` — raw PostgreSQL DDL, run directly against Supabase.
- `schema.prisma` — Prisma models mirroring the SQL 1:1, used by the backend/frontend for typed queries.

## Key design decisions
- **Single-tenant**: no `tenant_id` yet. Every table's shape allows adding one later without breaking relationships, since nothing depends on a global "site" scope today.
- **Media variants**: each `media_assets` row stores 3 object keys — `thumbnail_key`, `web_key`, `original_key` — plus an optional `watermarked_key`. The app resolves these to R2 URLs at request time; SQL never stores full URLs so bucket/CDN config can change freely.
- **Orientation & ratio enforcement**: `orientation` is stored, but the strict 2160×3240 / 3240×2160 pixel-ratio validation happens at the API layer on upload — not as a SQL constraint — since that logic needs to give the admin a helpful error message rather than a DB rejection.
- **Gallery access**: `gallery_access` supports a password (`password_hash`), a client assignment (`client_id`), or both — enforced by a `check` constraint requiring at least one. This covers "send anyone this link + password" and "only this logged-in client can see it."
- **Downloads are logged** (`download_log`) so the admin dashboard can show who downloaded what — useful for both analytics and license/usage tracking.

## Not yet decided (flagged earlier, still open)
- Multi-tenancy — revisit if this CMS is ever offered to other photographers.
- Whether watermarking is applied permanently to stored files vs. only at serve-time for public (non-client) views. Schema currently assumes **serve-time only** (original stays clean).

## Next step
Phase 1 continues with:
1. **Auth strategy** — Supabase Auth wiring, `middleware.ts` route protection, role checks (admin/client).
2. **Storage strategy** — R2 bucket/key naming convention, signed URL generation for private galleries.

Say the word and I'll move on to whichever of those two you want first — or if you'd rather revise anything in the schema first, flag it now since Phase 2 (Portfolio Management CRUD) will be built directly on top of these tables.
