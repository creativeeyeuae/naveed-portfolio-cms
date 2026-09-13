// Build-time reader for the REAL portfolio/journal content the admin already manages
// via CMS > Portfolio / CMS > Journal in app/page.tsx. That CMS saves to Supabase's
// site_settings table (key/value JSON rows, keys "nap_projects" / "nap_blog") -- the
// exact same table/pattern the live homepage's "Featured Work" section reads from
// client-side. This file is the server-side (build-time) equivalent, used by
// generateStaticParams/generateMetadata in app/work/[slug] and app/journal/[slug],
// and by sitemap.ts -- replacing the old lib/api.ts calls to a legacy Workers backend
// that was never actually deployed (confirmed: `wrangler deployments list` reports
// that Worker does not exist on the account), which is why those pages built empty.
//
// Real data only: whatever is actually saved in site_settings right now. No invented
// projects/posts, no fake fallback content -- an empty or unreachable table returns []
// exactly like the safe-fallback pattern this replaces.
export type CmsProjectImage = { url: string; orientation?: string; altText?: string };

export type CmsProject = {
  id: string;
  title: string;
  slug: string;
  categories?: string[];
  description?: string;
  fullDescription?: string;
  clientName?: string;
  location?: string;
  projectDate?: string;
  featured?: boolean;
  coverImage?: string;
  youtubeUrl?: string;
  images?: CmsProjectImage[];
  reels?: string[];
  // Additive fields for the canonical /work/[slug] page -- see app/page.tsx's Project type
  // for the full rationale. All optional; every field falls back to an existing one when unset.
  projectName?: string;
  bannerTitle?: string;
  bannerImage?: string;
};

export type CmsBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  date?: string;
  category?: string;
  coverImage?: string;
  content?: string;
};

// Plain REST fetch (same anon-key PostgREST call the CMS itself uses). Deliberately does
// NOT pass `cache: "no-store"`: this route tree is statically exported (output: "export"),
// and a fetch with cache:"no-store" (or any explicit revalidate) makes Next.js treat the
// page as needing dynamic rendering, which conflicts with static export and throws
// "couldn't be rendered statically because it used revalidate: 0 fetch ...". That throw
// was being silently swallowed by the catch below, surfacing as "no matching post/project"
// -> notFound() on a route already committed to in generateStaticParams -> a broken static
// export for that page (Next's generic client-only error shell instead of real content,
// without failing the overall build). Plain fetch (Next's default, static-safe caching)
// is correct here anyway: every `next build` is a fresh process, so there is no stale
// cross-build response to worry about -- each build always performs a real network call.
//
// Also memoized per build-process: generateStaticParams, generateMetadata and the page
// component each call this independently for the same key; one shared promise avoids
// firing that many separate requests for the same row.
const siteSettingsCache = new Map<string, Promise<any[]>>();

// Next's static export build renders /work/[slug] and /journal/[slug] pages across several
// worker processes in parallel, each with its OWN fresh module scope -- so the in-memory
// promise cache above only dedupes calls *within* one worker, not across all of them. Each
// worker independently fetches this same Supabase row. That's normally harmless (same query,
// same answer) EXCEPT a single transient network hiccup (a dropped connection, a brief rate
// limit, a slow DNS lookup) in just ONE worker used to be swallowed by a bare `catch { return
// [] }` -- silently treating "the real project list" as "there are no projects" for whichever
// one route happened to render in that unlucky worker, which then baked a real 404 into that
// route's static HTML even though the project genuinely exists (confirmed live case: WIC 2025
// intermittently 404'd while the other two real projects on the same build succeeded). Retrying
// a few times before giving up closes that window without changing behavior for the genuinely-
// empty/misconfigured case (which still falls back to [] once every attempt fails).
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response | null> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  console.error(`cmsData: fetch failed after ${attempts} attempts for ${url}`, lastErr);
  return null;
}

async function readSiteSettingsKey<T>(key: string): Promise<T[]> {
  if (siteSettingsCache.has(key)) return siteSettingsCache.get(key)!;
  const promise = (async (): Promise<T[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return [];
    try {
      const res = await fetchWithRetry(
        `${url}/rest/v1/site_settings?select=value&key=eq.${encodeURIComponent(key)}`,
        { headers: { apikey: anonKey } }
      );
      if (!res) return [];
      const rows = (await res.json()) as { value?: string }[];
      const value = rows?.[0]?.value;
      if (!value) return [];
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  })();
  siteSettingsCache.set(key, promise);
  return promise;
}

export function getRealProjects(): Promise<CmsProject[]> {
  return readSiteSettingsKey<CmsProject>("nap_projects");
}

export function getRealBlogPosts(): Promise<CmsBlogPost[]> {
  return readSiteSettingsKey<CmsBlogPost>("nap_blog");
}

// The general CMS settings row ("nap_settings") is stored as a single JSON OBJECT, not an
// array -- readSiteSettingsKey above only returns rows that parse as an array, so it can't
// be reused here. Currently only used to read the "Image Permission Requests: ON/OFF" CMS
// switch for /work/[slug]; defaults to enabled (matching the live CMS's own default) if the
// row is missing/unreachable, so a misconfigured/offline settings row never silently hides
// a feature that was never actually turned off.
let siteSettingsObjectCache: Promise<Record<string, unknown>> | null = null;
async function readSiteSettingsObject(): Promise<Record<string, unknown>> {
  if (siteSettingsObjectCache) return siteSettingsObjectCache;
  siteSettingsObjectCache = (async (): Promise<Record<string, unknown>> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return {};
    try {
      const res = await fetchWithRetry(
        `${url}/rest/v1/site_settings?select=value&key=eq.nap_settings`,
        { headers: { apikey: anonKey } }
      );
      if (!res) return {};
      const rows = (await res.json()) as { value?: string }[];
      const value = rows?.[0]?.value;
      if (!value) return {};
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  })();
  return siteSettingsObjectCache;
}

export async function getImagePermissionEnabled(): Promise<boolean> {
  const settings = await readSiteSettingsObject();
  return settings.imagePermissionEnabled !== false;
}
