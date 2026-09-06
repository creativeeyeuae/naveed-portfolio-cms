import type { MetadataRoute } from "next";
import { api } from "@/lib/api";

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

async function getWorkEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const albums = (await api.albums.list()) as { slug: string; updatedAt?: string }[];
    return albums.map((a) => ({
      url: `https://bynaveedanjum.com/work/${a.slug}/`,
      lastModified: a.updatedAt ? new Date(a.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    return [];
  }
}

async function getJournalEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = (await api.blog.list()) as { slug: string; publishedAt?: string }[];
    return posts.map((p) => ({
      url: `https://bynaveedanjum.com/journal/${p.slug}/`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
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
    ...work,
    ...journal,
  ];
}
