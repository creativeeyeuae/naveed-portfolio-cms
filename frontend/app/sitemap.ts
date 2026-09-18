import type { MetadataRoute } from "next";
import { getRealProjects, getRealBlogPosts } from "@/lib/cmsData";
import { SERVICE_PAGES } from "@/lib/servicePagesData";

export const dynamic = "force-static";

// Next.js metadata route -- generates a static sitemap.xml at build time, compatible
// with output:"export". The homepage is always listed. /work/[slug]/ and
// /journal/[slug]/ entries are added dynamically from the new backend when
// it's reachable at build time; on any failure this falls back to just the
// homepage rather than breaking the build (same safe-fallback pattern as
// generateStaticParams in those routes). A handful of separate route folders
// (about/, contact/, photography/, cinematography/) also exist in this repo but currently
// render placeholder/stub content from Naveed's own in-progress backend rebuild -- listing
// those here would just point Google at thin/duplicate pages, which hurts rather than
// helps. Add real entries here once those routes carry finished content, or once the
// site moves to real per-section URLs (see the SEO report for that recommendation).

// Real entries from site_settings("nap_projects"/"nap_blog") -- the same data the CMS
// Portfolio/Journal tabs and the homepage already read/write. See lib/cmsData.ts for why
// this replaced the old lib/api.ts calls (that backend was never actually deployed).
async function getWorkEntries(): Promise<MetadataRoute.Sitemap> {
  const projects = await getRealProjects();
  return projects.map((p) => ({
    url: `https://bynaveedanjum.com/work/${p.slug}/`,
    lastModified: p.projectDate ? new Date(p.projectDate) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
}

async function getJournalEntries(): Promise<MetadataRoute.Sitemap> {
  const posts = await getRealBlogPosts();
  return posts.map((p) => ({
    url: `https://bynaveedanjum.com/journal/${p.slug}/`,
    lastModified: p.date ? new Date(p.date) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}

// The six real, standalone SEO service pages (app/<slug>/page.tsx) -- unlike the stub
// route folders mentioned above, these carry finished, unique content, so they belong in
// the sitemap. SERVICE_PAGES is the single shared list also used for their cross-linking.
function getServicePageEntries(): MetadataRoute.Sitemap {
  return SERVICE_PAGES.map((s) => ({
    url: `https://bynaveedanjum.com/${s.slug}/`,
    lastModified: new Date("2026-09-11"),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [work, journal] = await Promise.all([getWorkEntries(), getJournalEntries()]);
  return [
    {
      url: "https://bynaveedanjum.com/",
      lastModified: new Date("2026-09-06"),
      changeFrequency: "weekly",
      priority: 1,
    },
    // Real, finished content (not a stub like the photography/cinematography folders
    // mentioned above) -- the dedicated gear/equipment page, so it belongs in the sitemap.
    {
      url: "https://bynaveedanjum.com/gear/",
      lastModified: new Date("2026-09-18"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Real, finished, CMS-driven packages/pricing page (new standalone /packages route),
    // so it belongs in the sitemap too.
    {
      url: "https://bynaveedanjum.com/packages/",
      lastModified: new Date("2026-09-18"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...getServicePageEntries(),
    ...work,
    ...journal,
  ];
}
