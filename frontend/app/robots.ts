import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Next.js metadata route -- generates a static robots.txt at build time, compatible
// with output:"export". Blocks the admin/CMS paths (the CMS itself is additionally
// PIN-gated and never linked from search-visible content) and points crawlers at the
// sitemap for the one real, indexable page this site currently serves.
//
// OAI-SearchBot gets its own explicit rule, kept separate from the general "*" rule,
// so ChatGPT Search can discover and (potentially) cite this site. This does not
// guarantee ChatGPT will cite or recommend the site -- it only ensures the crawler
// isn't accidentally blocked. GPTBot (used for OpenAI's model training, not search)
// is deliberately left alone here since that's a separate, unrelated decision.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/*?admin=*"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/admin", "/admin/", "/*?admin=*"],
      },
    ],
    sitemap: "https://bynaveedanjum.com/sitemap.xml",
  };
}
