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

async function readSiteSettingsKey<T>(key: string): Promise<T[]> {
  if (siteSettingsCache.has(key)) return siteSettingsCache.get(key)!;
  const promise = (async (): Promise<T[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return [];
    try {
      const res = await fetch(
        `${url}/rest/v1/site_settings?select=value&key=eq.${encodeURIComponent(key)}`,
        { headers: { apikey: anonKey } }
      );
      if (!res.ok) return [];
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
