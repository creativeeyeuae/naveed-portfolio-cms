import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRealBlogPosts, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata, articleJsonLd, jsonLdScriptProps } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Real, indexable per-post URL: /journal/[slug]/. Not one of the 4
// protected routes. Same build-safety pattern as /work/[slug]: under
// output:"export", generateStaticParams() returning an EMPTY array is
// treated identically to a missing function and hard-fails the entire
// site build (confirmed against Next.js's own build source). So instead
// of failing to [], we always return at least one path — a placeholder
// slug that is never linked anywhere — and let the page itself call
// notFound() for that placeholder or any real lookup failure.
const PLACEHOLDER_SLUG = "__no-posts-yet__";

type BlogPostDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  category?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
  coverMedia?: { webKey?: string | null; externalUrl?: string | null } | null;
};

const MEDIA_CDN_HOST = process.env.NEXT_PUBLIC_MEDIA_CDN_HOST || "media.naveedanjum.com";
function coverImageUrl(post: BlogPostDetail): string | undefined {
  const m = post.coverMedia;
  if (!m) return undefined;
  if (m.externalUrl) return m.externalUrl;
  if (m.webKey) return `https://${MEDIA_CDN_HOST}/${m.webKey}`;
  return undefined;
}

// Real posts come from the same site_settings("nap_blog") row the CMS Journal tab
// already reads/writes -- see lib/cmsData.ts.
async function getPost(slug: string): Promise<BlogPostDetail | null> {
  if (slug === PLACEHOLDER_SLUG) return null;
  const posts = await getRealBlogPosts();
  const p = posts.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    // Fall back to the excerpt only if a post genuinely has no body yet (never invented).
    content: p.content || p.excerpt || "",
    category: p.category,
    publishedAt: p.date,
    coverMedia: p.coverImage ? { externalUrl: p.coverImage } : null,
  };
}

export async function generateStaticParams() {
  const posts = await getRealBlogPosts();
  if (posts.length === 0) return [{ slug: PLACEHOLDER_SLUG }];
  return posts.map((p) => ({ slug: p.slug }));
}

// output:"export" requires every dynamic param to be known at build time;
// this pairs with the placeholder-path pattern above.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { robots: { index: false, follow: true } };
  return buildMetadata({
    path: `/journal/${post.slug}/`,
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    imageUrl: coverImageUrl(post),
    ogType: "article",
    publishedTime: post.publishedAt,
  });
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, site] = await Promise.all([getPost(slug), getPublicSiteInfo()]);

  if (!post) notFound();

  const jsonLd = articleJsonLd({
    path: `/journal/${post.slug}/`,
    title: post.title,
    description: post.seoDescription || post.excerpt,
    imageUrl: coverImageUrl(post),
    datePublished: post.publishedAt,
    category: post.category,
  });

  // SiteHeader/SiteFooter added -- this page previously had neither, so it was a dead end:
  // no way back to the rest of the site except the single "Back to Journal" text link, and
  // no nav/footer at all (every other real page has both). Same pattern as /work/[slug].
  return (
    <main style={{ background: "var(--c-bg,#09060E)", color: "var(--c-fg,#FFFFFF)", minHeight: "100vh" }}>
      <script {...jsonLdScriptProps(jsonLd)} />
      <SiteHeader site={site} />
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "140px 24px 80px", fontFamily: "Georgia, serif" }}>
        <Link href="/journal" style={{ color: "var(--c-mid,#A892C6)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>&larr; Back to Journal</Link>
        {post.category && (
          <div style={{ marginTop: 24, color: "var(--c-p,#8B5CF6)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{post.category}</div>
        )}
        <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: 0.5, marginTop: 8 }}>{post.title}</h1>
        {post.publishedAt && (
          <div style={{ color: "var(--c-mid,#A892C6)", fontSize: 13, marginTop: 8 }}>
            {new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </div>
        )}
        <div style={{ marginTop: 32, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{post.content}</div>
      </article>
      <SiteFooter site={site} />
    </main>
  );
}
