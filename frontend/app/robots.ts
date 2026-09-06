import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Next.js metadata route -- generates a static robots.txt at build time, compatible
// with output:"export". Blocks the admin/CMS paths (the CMS itself is additionally
// PIN-gated and never linked from search-visible content) and points crawlers at the
// sitemap for the one real, indexable page this site currently serves.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/*?admin=*"],
    },
    sitemap: "https://bynaveedanjum.com/sitemap.xml",
  };
}
