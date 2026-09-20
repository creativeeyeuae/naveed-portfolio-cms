import type { MetadataRoute } from "next";
import { getRealProjects, getRealBlogPosts } from "@/lib/cmsData";
import { SERVICE_PAGES } from "@/lib/servicePagesData";

export const dynamic = "force-static";

// Next.js metadata route -- generates a static sitemap.xml at build time, compatible
// with output:"export". The homepage is always listed. /work/[slug]/ and
// /journal/[slug]/ entries are added dynamically from the CMS's real project/blog data
// (see getWorkEntries/getJournalEntries below); on any failure this falls back to just the
// homepage rather than breaking the build (same safe-fallback pattern as
// generateStaticParams in those routes). /about/ and /contact/ are real, finished,
// CMS-driven pages (not the placeholder/stub content an earlier comment here described --
// that description was stale). /photography/ and /cinematography/ were rebuilt from a
// dead-backend stub into real pages too (see those routes' own comments), so all four are
// listed below alongside the other real static routes.

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
    // Real, finished content -- the dedicated gear/equipment page, so it belongs in the sitemap.
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
    // Real, CMS-driven pages that were missing from this list (see the comment above).
    {
      url: "https://bynaveedanjum.com/about/",
      lastModified: new Date("2026-09-20"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://bynaveedanjum.com/contact/",
      lastModified: new Date("2026-09-20"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://bynaveedanjum.com/photography/",
      lastModified: new Date("2026-09-20"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://bynaveedanjum.com/cinematography/",
      lastModified: new Date("2026-09-20"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Journal index and CV -- previously in-memory-only SPA pages (/?page=blog|cv) with no
    // real crawlable URL of their own. Both now real routes (app/journal/page.tsx,
    // app/cv/page.tsx), so they belong here alongside every other real static route.
    {
      url: "https://bynaveedanjum.com/journal/",
      lastModified: new Date("2026-09-20"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://bynaveedanjum.com/cv/",
      lastModified: new Date("2026-09-20"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...getServicePageEntries(),
    ...work,
    ...journal,
  ];
}
