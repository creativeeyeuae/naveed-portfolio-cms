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
// No site-wide default OG image exists yet -- omit the tag entirely
// rather than pointing at a file that doesn't exist (a broken og:image
// is worse for link previews than none). Set this once a real 1200x630
// default/brand image is added to the frontend and deployed.
export const DEFAULT_OG_IMAGE: string | undefined = undefined;

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

/** Spread onto a <script> element: <script {...jsonLdScriptProps(data)} /> */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  } as const;
}
