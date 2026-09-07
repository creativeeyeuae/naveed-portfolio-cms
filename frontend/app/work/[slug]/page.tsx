import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { buildMetadata, creativeWorkJsonLd, jsonLdScriptProps } from "@/lib/seo";

// Real, indexable per-project URL: /work/[slug]/. Deliberately NOT one of
// the 4 protected routes (/about /contact /photography /cinematography).
//
// BUILD-SAFETY, IMPORTANT: under output:"export", Next.js hard-fails the
// ENTIRE build if a dynamic route's generateStaticParams returns zero
// paths (confirmed against node_modules/next/dist/build/index.js -- the
// check is `workerResult.prerenderedRoutes.length`, not whether the
// function exists). An empty array is NOT a safe fallback here the way it
// is for sitemap.ts. So: on any failure, or when there simply are no
// published projects yet, generateStaticParams returns one placeholder
// slug instead of []. That placeholder always 404s via notFound() below
// and is marked noindex -- it is never linked from anywhere and never
// listed in sitemap.ts (which independently calls the real API and lists
// nothing when there's nothing real to list). This is what actually
// guarantees the live site's build can never break, replacing the
// (incorrect) plain try/catch-to-[] pattern used in the original plan.
const PLACEHOLDER_SLUG = "__no-projects-yet__";

const MEDIA_CDN_HOST = process.env.NEXT_PUBLIC_MEDIA_CDN_HOST || "media.naveedanjum.com";
function mediaUrl(m: { webKey?: string | null; externalUrl?: string | null }): string {
  if (m.externalUrl) return m.externalUrl;
  if (m.webKey) return `https://${MEDIA_CDN_HOST}/${m.webKey}`;
  return "";
}

type AlbumDetail = {
  id: string;
  type?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  fullDescription?: string | null;
  location?: string | null;
  projectDate?: string | null;
  youtubeUrl?: string | null;
  clientName?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  media?: { id: string; webKey?: string | null; externalUrl?: string | null; orientation?: string | null; altText?: string | null }[];
};

async function getAlbum(slug: string): Promise<AlbumDetail | null> {
  if (slug === PLACEHOLDER_SLUG) return null;
  try {
    return (await api.albums.get(slug)) as AlbumDetail;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const albums = (await api.albums.list()) as { slug: string }[];
    if (albums.length === 0) return [{ slug: PLACEHOLDER_SLUG }];
    return albums.map((a) => ({ slug: a.slug }));
  } catch {
    return [{ slug: PLACEHOLDER_SLUG }];
  }
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return { robots: { index: false, follow: true } };
  const cover = (album.media || [])[0];
  return buildMetadata({
    path: `/work/${album.slug}/`,
    title: album.seoTitle || album.title,
    description: album.seoDescription || album.description,
    imageUrl: cover ? mediaUrl(cover) : undefined,
    ogType: "website",
  });
}

export default async function WorkProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = await getAlbum(slug);

  if (!album) notFound();

  const items = (album.media || [])
    .map((m) => ({ ...m, url: mediaUrl(m) }))
    .filter((m) => m.url);

  const jsonLd = creativeWorkJsonLd({
    path: `/work/${album.slug}/`,
    title: album.title,
    description: album.seoDescription || album.description,
    imageUrl: items[0]?.url,
    dateCreated: album.projectDate,
    location: album.location,
    clientName: album.clientName,
    contentType: album.type,
  });

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <script {...jsonLdScriptProps(jsonLd)} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 32px" }}>
        <a href="/" style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>&larr; Back to Work</a>
        <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: 1, marginTop: 24 }}>{album.title}</h1>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", color: "var(--text-muted)", fontSize: 13, marginTop: 12 }}>
          {album.clientName && <span>{album.clientName}</span>}
          {album.location && <span>{album.location}</span>}
          {album.projectDate && <span>{new Date(album.projectDate).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</span>}
        </div>
        {(album.fullDescription || album.description) && (
          <p style={{ marginTop: 24, maxWidth: 720, lineHeight: 1.7, color: "var(--text-primary)" }}>
            {album.fullDescription || album.description}
          </p>
        )}
        {album.youtubeUrl && (
          <div style={{ marginTop: 32, aspectRatio: "16/9", maxWidth: 900 }}>
            <iframe
              src={album.youtubeUrl.replace("watch?v=", "embed/")}
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
      {items.length > 0 && (
        <>
          {/* Same black & white -> color hover treatment used on the homepage Featured Work
              and /work gallery grids, applied here too so it's consistent wherever project
              images appear. This page is a Server Component (async, no "use client"), so the
              effect is done in pure CSS (:hover) rather than onMouseEnter/onMouseLeave. */}
          <style>{`.wd-img{filter:grayscale(1);transition:filter 0.5s ease}
            .wd-img:hover{filter:grayscale(0)}`}</style>
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: "0 24px 64px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.url}
                alt={m.altText || album.title}
                className="wd-img"
                style={{
                  width: "100%",
                  aspectRatio: m.orientation === "portrait" ? "2/3" : "3/2",
                  objectFit: "cover",
                }}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
