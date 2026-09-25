// Shared SEO helpers for the whole site: metadata builder, JSON-LD
// builders, canonical-URL resolution, and a slugify() for CMS use.
//
// Design: every helper here is a pure function that DERIVES SEO output
// from fields that already exist on Album/BlogPost (title, description,
// seoTitle, seoDescription, media, location, projectDate, clientName,
// publishedAt, category) plus the page's own URL path. Nothing here
// requires a schema change or touches the database -- it's the "auto
// SEO" layer described in the Phase 2 plan: CMS-entered seoTitle /
// seoDescription always win when present, and every other tag (canonical,
// Open Graph, Twitter Card, JSON-LD) is generated automatically so the
// owner never has to fill those in by hand.
//
// Used by: frontend/app/work/[slug]/page.tsx, frontend/app/journal/[slug]/page.tsx.
// Safe to import from any other page/route going forward.

import type { Metadata } from "next";

export const SITE_URL = "https://bynaveedanjum.com";
export const SITE_NAME = "Naveed Anjum";
// Site-wide fallback OG/share image for any page that doesn't set its own imageUrl.
// Same photo the root layout (app/layout.tsx) already uses for the homepage's own
// og:image and structured data -- reusing it here keeps every page consistent instead
// of some pages having a link-preview image and others (e.g. /gear, /packages, the
// service-area pages) showing a blank/generic preview when shared.
export const DEFAULT_OG_IMAGE: string | undefined =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop&q=80";

/**
 * URL-safe slug from arbitrary text. Used by the CMS to auto-generate a
 * slug from a title while the owner types (they can still edit it).
 * Pure/deterministic, no I/O.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // strip accents
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 96);
}

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

function resolveImage(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return DEFAULT_OG_IMAGE;
  return imageUrl.startsWith("http") ? imageUrl : absoluteUrl(imageUrl);
}

// ----------------------------------------------------------------------------
// Next.js <Metadata> builder -- title, description, canonical, OG, Twitter Card
// ----------------------------------------------------------------------------

export type PageSeoInput = {
  /** e.g. "/work/my-slug/" -- always the real published URL, trailing slash */
  path: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  ogType?: "website" | "article" | "profile";
  publishedTime?: string | null;
  /** true = not found / placeholder / unpublished -- emit noindex only */
  noindex?: boolean;
  /**
   * Optional meta keywords -- Google/Bing have ignored this tag for ranking since ~2009,
   * so it has no real SEO effect, but it's harmless to include when explicitly requested.
   * Pass a short, natural list (no stuffing); omit entirely rather than padding it out.
   */
  keywords?: string[];
};

export function buildMetadata(input: PageSeoInput): Metadata {
  if (input.noindex) {
    return { robots: { index: false, follow: true } };
  }

  const canonical = absoluteUrl(input.path);
  const description = input.description || undefined;
  const image = resolveImage(input.imageUrl);

  return {
    title: input.title,
    description,
    ...(input.keywords && input.keywords.length ? { keywords: input.keywords.join(", ") } : {}),
    alternates: { canonical },
    openGraph: {
      title: input.title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: input.ogType === "article" ? "article" : "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// ----------------------------------------------------------------------------
// JSON-LD structured data builders (schema.org)
// Rendered via jsonLdScriptProps() into a <script type="application/ld+json">
// on the page. Plain data objects -- no dependency on Next's Metadata type.
// ----------------------------------------------------------------------------

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function creativeWorkJsonLd(input: {
  path: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  dateCreated?: string | null;
  location?: string | null;
  clientName?: string | null;
  contentType?: string | null;
}) {
  const image = resolveImage(input.imageUrl);
  return {
    "@context": "https://schema.org",
    "@type": input.contentType === "cinematography" ? "VideoObject" : "CreativeWork",
    name: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: absoluteUrl(input.path),
    ...(image ? { image } : {}),
    ...(input.dateCreated ? { dateCreated: input.dateCreated } : {}),
    ...(input.location ? { contentLocation: { "@type": "Place", name: input.location } } : {}),
    creator: { "@type": "Person", name: SITE_NAME },
    ...(input.clientName ? { about: input.clientName } : {}),
  };
}

export function articleJsonLd(input: {
  path: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  datePublished?: string | null;
  category?: string | null;
}) {
  const image = resolveImage(input.imageUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: absoluteUrl(input.path),
    ...(image ? { image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.category ? { articleSection: input.category } : {}),
    author: { "@type": "Person", name: SITE_NAME },
    publisher: organizationJsonLd(),
  };
}

// LocalBusiness/ProfessionalService is already emitted site-wide, once, in app/layout.tsx's
// @graph (the "#service"/"#person" nodes) -- every page inherits it via the root layout, so
// it is NOT repeated here. Repeating it per-page would be exactly the "duplicate schema"
// the SEO brief says to avoid. These three builders cover the schema types that DON'T
// already exist anywhere: a specific Service offered, the page's place in the site
// hierarchy, and the hero photo as its own described entity.

export function serviceJsonLd(input: {
  path: string;
  name: string;
  description?: string | null;
  areaServed?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: input.name,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: absoluteUrl(input.path),
    provider: { "@id": `${SITE_URL}/#service` }, // same ProfessionalService node from layout.tsx
    areaServed: (input.areaServed && input.areaServed.length ? input.areaServed : ["Dubai", "United Arab Emirates"]).map((a) => ({
      "@type": "Place",
      name: a,
    })),
  };
}

/** crumbs: ordered from Home -> ... -> current page, e.g. [{name:"Home",path:"/"},{name:"Commercial Photographer",path:"/commercial-photographer-dubai/"}] */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function imageObjectJsonLd(input: { url: string; alt?: string | null; caption?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: input.url,
    url: input.url,
    ...(input.alt ? { name: input.alt } : {}),
    ...(input.caption ? { caption: input.caption } : {}),
    creator: { "@type": "Person", name: SITE_NAME },
  };
}

/** Spread onto a <script> element: <script {...jsonLdScriptProps(data)} /> */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  } as const;
}
