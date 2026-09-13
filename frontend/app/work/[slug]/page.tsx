import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRealProjects, getImagePermissionEnabled, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata, creativeWorkJsonLd, jsonLdScriptProps } from "@/lib/seo";
import ProjectGallery from "@/components/work/ProjectGallery";
import ProjectEngagement from "@/components/work/ProjectEngagement";
import SiteHeader from "@/components/work/SiteHeader";
import SiteFooter from "@/components/work/SiteFooter";

// Real, indexable per-project URL: /work/[slug]/ -- the SINGLE canonical project detail page
// for the whole site (consolidated from the two pre-existing, independent implementations:
// this static route, previously a minimal SEO fallback, and a separate client-state "SPA"
// view inside app/page.tsx that had no real URL and only lived in-memory). The rich banner/
// gallery/likes/comments design is ported here; app/page.tsx's homepage and Work grid now
// link to these real URLs instead of driving that in-memory view. Deliberately NOT one of
// the 4 protected routes (/about /contact /photography /cinematography).
//
// BUILD-SAFETY, IMPORTANT: under output:"export", Next.js hard-fails the ENTIRE build if a
// dynamic route's generateStaticParams returns zero paths (confirmed against
// node_modules/next/dist/build/index.js -- the check is `workerResult.prerenderedRoutes.length`,
// not whether the function exists). An empty array is NOT a safe fallback here the way it is
// for sitemap.ts. So: on any failure, or when there simply are no published projects yet,
// generateStaticParams returns one placeholder slug instead of []. That placeholder always
// 404s via notFound() below and is marked noindex -- it is never linked from anywhere and
// never listed in sitemap.ts (which independently calls the real API and lists nothing when
// there's nothing real to list).
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
  projectName?: string | null;
  bannerTitle?: string | null;
  description?: string | null;
  fullDescription?: string | null;
  location?: string | null;
  projectDate?: string | null;
  youtubeUrl?: string | null;
  clientName?: string | null;
  categories?: string[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  reels?: string[] | null;
  media?: { id: string; webKey?: string | null; externalUrl?: string | null; orientation?: string | null; altText?: string | null }[];
  bannerMedia?: { webKey?: string | null; externalUrl?: string | null } | null;
};

// Real projects come from the same site_settings("nap_projects") row the CMS Portfolio
// tab and the homepage's "Featured Work" section already read/write -- see lib/cmsData.ts.
async function getAlbum(slug: string): Promise<AlbumDetail | null> {
  if (slug === PLACEHOLDER_SLUG) return null;
  const projects = await getRealProjects();
  const p = projects.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    projectName: p.projectName,
    bannerTitle: p.bannerTitle,
    description: p.description,
    fullDescription: p.fullDescription,
    location: p.location,
    projectDate: p.projectDate,
    youtubeUrl: p.youtubeUrl,
    clientName: p.clientName,
    categories: p.categories,
    reels: p.reels,
    media: (p.images || []).map((img, i) => ({
      id: `${p.id}-${i}`,
      externalUrl: img.url,
      orientation: img.orientation,
      altText: img.altText,
    })),
    bannerMedia: p.bannerImage ? { externalUrl: p.bannerImage } : null,
  };
}

export async function generateStaticParams() {
  const projects = await getRealProjects();
  if (projects.length === 0) return [{ slug: PLACEHOLDER_SLUG }];
  return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return { robots: { index: false, follow: true } };
  const cover = (album.media || [])[0];
  return buildMetadata({
    path: `/work/${album.slug}/`,
    title: album.seoTitle || album.projectName || album.title,
    description: album.seoDescription || album.description,
    imageUrl: cover ? mediaUrl(cover) : undefined,
    ogType: "website",
  });
}

export default async function WorkProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [album, permissionEnabled, site] = await Promise.all([getAlbum(slug), getImagePermissionEnabled(), getPublicSiteInfo()]);

  if (!album) notFound();

  const items = (album.media || [])
    .map((m) => ({ id: m.id, url: mediaUrl(m), orientation: m.orientation || undefined, caption: m.altText || undefined }))
    .filter((m) => m.url);
  const bannerImageUrl = album.bannerMedia ? mediaUrl(album.bannerMedia) : items[0]?.url;
  const bannerTitle = (album.bannerTitle || album.title || "").trim();
  const displayName = (album.projectName || album.title || "").trim();

  const jsonLd = creativeWorkJsonLd({
    path: `/work/${album.slug}/`,
    title: displayName,
    description: album.seoDescription || album.description,
    imageUrl: bannerImageUrl,
    dateCreated: album.projectDate,
    location: album.location,
    clientName: album.clientName,
    contentType: album.type,
  });

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <script {...jsonLdScriptProps(jsonLd)} />

      <SiteHeader site={site} />

      {/* BANNER */}
      <div style={{ position: "relative", overflow: "hidden", background: "var(--bg-surface-1, #140D21)", minHeight: "clamp(220px,36vh,400px)", display: "flex", alignItems: "center", padding: "48px 24px 32px" }}>
        {bannerImageUrl && (
          <>
            <img src={bannerImageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,rgba(9,6,14,0.85) 0%,rgba(9,6,14,0.45) 100%)" }} />
          </>
        )}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <a href="/" style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", display: "inline-block", marginBottom: 18 }}>&larr; All Work</a>
          {album.categories && album.categories.length > 0 && (
            <div style={{ fontSize: 11, letterSpacing: 6, color: "var(--text-secondary, #E2D9F3)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ width: 24, height: 1, background: "var(--text-secondary, #E2D9F3)", display: "inline-block" }} />
              {album.categories.join(" · ")}
            </div>
          )}
          <h1 style={{ fontSize: "clamp(30px,5vw,58px)", fontWeight: 700, letterSpacing: 0.5, margin: 0, color: "#fff" }}>
            {bannerTitle.split("\n").map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 32px" }}>
        {/* PROJECT NAME */}
        {displayName && displayName !== bannerTitle && (
          <h2 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, letterSpacing: 0.3, margin: "0 0 20px" }}>{displayName}</h2>
        )}

        {/* DESCRIPTION */}
        {(album.fullDescription || album.description) && (
          <p style={{ marginTop: 0, marginBottom: 24, maxWidth: 720, lineHeight: 1.8, color: "var(--text-muted, #A892C6)", fontSize: 15 }}>
            {album.fullDescription || album.description}
          </p>
        )}

        {/* TITLE / LOCATION / DATE / CLIENT */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", color: "var(--text-muted, #A892C6)", fontSize: 13, marginBottom: 40 }}>
          {album.location && <span>📍 {album.location}</span>}
          {album.projectDate && <span>📅 {new Date(album.projectDate).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</span>}
          {album.clientName && <span>👤 {album.clientName}</span>}
        </div>

        {album.youtubeUrl && (
          <div style={{ marginBottom: 40, aspectRatio: "16/9", maxWidth: 900 }}>
            <iframe
              src={album.youtubeUrl.replace("watch?v=", "embed/")}
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* GALLERY (images + reels + per-image permission request) */}
        <ProjectGallery projectId={album.id} projectName={displayName} images={items} reels={album.reels || undefined} permissionEnabled={permissionEnabled} />

        {/* LIKES / COMMENTS */}
        <ProjectEngagement projectId={album.id} />

        {/* COPYRIGHT NOTICE */}
        <div style={{ marginTop: 8, paddingTop: 24, borderTop: "1px solid var(--border-subtle, #2D1F45)", fontSize: 12, color: "var(--text-dim, #6B5C87)", lineHeight: 1.7 }}>
          © {new Date().getFullYear()} Naveed Anjum / Creative Fusion LLC. All images and video on this page are protected by copyright and may not be copied, reproduced or reused without permission. Use the "Request Permission" button on any image above to ask about licensing it.
        </div>
      </div>

      <SiteFooter site={site} />
    </main>
  );
}
