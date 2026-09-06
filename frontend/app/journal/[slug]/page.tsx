import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";

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
};

async function getPost(slug: string): Promise<BlogPostDetail | null> {
  if (slug === PLACEHOLDER_SLUG) return null;
  try {
    return (await api.blog.get(slug)) as BlogPostDetail;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const posts = (await api.blog.list()) as { slug: string }[];
    if (posts.length === 0) return [{ slug: PLACEHOLDER_SLUG }];
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [{ slug: PLACEHOLDER_SLUG }];
  }
}

// output:"export" requires every dynamic param to be known at build time;
// this pairs with the placeholder-path pattern above.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { robots: { index: false, follow: true } };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 80px" }}>
        <a href="/" style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>&larr; Back to Journal</a>
        {post.category && (
          <div style={{ marginTop: 24, color: "var(--accent-primary)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{post.category}</div>
        )}
        <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: 0.5, marginTop: 8 }}>{post.title}</h1>
        {post.publishedAt && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
            {new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </div>
        )}
        <div style={{ marginTop: 32, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{post.content}</div>
      </article>
    </main>
  );
}
