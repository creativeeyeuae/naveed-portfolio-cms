import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Next.js metadata route -- generates a static sitemap.xml at build time, compatible
// with output:"export". Deliberately lists only the homepage: the real, CMS-driven
// site (Work/About/Packages/Journal/CV/Contact/Booking) all lives on one URL ("/")
// with client-side section switching rather than separate routes, so that's the only
// URL that's actually real, unique content today. A handful of separate route folders
// (about/, contact/, photography/, cinematography/) also exist in this repo but currently
// render placeholder/stub content from Naveed's own in-progress backend rebuild -- listing
// those here would just point Google at thin/duplicate pages, which hurts rather than
// helps. Add real entries here once those routes carry finished content, or once the
// site moves to real per-section URLs (see the SEO report for that recommendation).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://bynaveedanjum.com/",
      lastModified: new Date("2026-09-06"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
