import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRealProjects, getImagePermissionEnabled, getPublicSiteInfo, CmsProject } from "@/lib/cmsData";
import { buildMetadata, creativeWorkJsonLd, jsonLdScriptProps, absoluteUrl } from "@/lib/seo";
import ProjectGallery from "@/components/work/ProjectGallery";
import ProjectEngagement from "@/components/work/ProjectEngagement";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Real, indexable per-project URL: /work/[slug]/ -- the SINGLE canonical project detail page
// for the whole site (consolidated from the two pre-existing, independent implementations:
// this static route, previously a minimal SEO fallback, and a separate client-state "SPA"
// view inside app/page.tsx that had no real URL and only lived in-memory). app/page.tsx's
// homepage and Work grid link to these real URLs instead of driving that in-memory view.
// Deliberately NOT one of the 4 protected routes (/about /contact /photography /cinematography).
//
// This page is styled as a direct, intentional extension of the rest of the site: the hero
// reuses the exact visual language of the shared <PageBanner/> (app/page.tsx) -- same dark
// background treatment, image overlay gradient, eyebrow+dash, clamp() title sizing -- and the
// same C token palette / button styles the homepage and shared header/footer already use.
// Nothing here introduces a second design system.
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

// Same CSS-variable-with-fallback tokens as SiteHeader.tsx/SiteFooter.tsx/app/page.tsx's own
// `C` object -- kept in sync deliberately so this page never drifts into its own palette.
const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

const MEDIA_CDN_HOST = process.env.NEXT_PUBLIC_MEDIA_CDN_HOST || "media.naveedanjum.com";

// Tolerant slug comparison -- a slug typed/edited in the CMS can pick up leading/trailing
// whitespace or inconsistent casing without anyone noticing (the CMS's own slug field never
// normalizes on input). Comparing raw strings turned that into a silent, permanent 404 for a
// project that visibly exists in the CMS. Trim + lowercase + strip stray slashes before every
// comparison below (both here and in generateStaticParams) so a cosmetic slug mismatch can
// never be the reason a real project's page won't open.
function normalizeSlug(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}
function mediaUrl(m: { webKey?: string | null; externalUrl?: string | null }): string {
  if (m.externalUrl) return m.externalUrl;
  if (m.webKey) return `https://${MEDIA_CDN_HOST}/${m.webKey}`;
  return "";
}

type AlbumDetail = {
  id: string;
  title: string;
  slug: string;
  projectName?: string | null;
  bannerTitle?: string | null;
  bannerImage?: string | null;
  coverImage?: string | null;
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
};

function toAlbum(p: CmsProject): AlbumDetail {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    projectName: p.projectName,
    bannerTitle: p.bannerTitle,
    bannerImage: p.bannerImage,
    coverImage: p.coverImage,
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
  };
}

// Real projects come from the same site_settings("nap_projects") row the CMS Portfolio
// tab and the homepage's "Featured Work" section already read/write -- see lib/cmsData.ts.
//
// A slug lookup first tries the project's CURRENT slug. If nothing matches, it falls back to
// each project's `previousSlugs` history (written automatically by the CMS's saveProj()
// whenever a title/slug changes -- see app/page.tsx) so an old bookmarked/shared link keeps
// resolving to the right project instead of hard-404ing the moment a title is edited. When a
// request resolves via a previous slug, `redirectTo` carries the project's current slug so
// the page component can render a soft redirect instead of duplicating content under two URLs.
async function getAlbum(slug: string): Promise<{ album: AlbumDetail; redirectTo?: string } | null> {
  if (slug === PLACEHOLDER_SLUG) return null;
  const wanted = normalizeSlug(slug);
  const projects = await getRealProjects();
  let p = projects.find((x) => normalizeSlug(x.slug) === wanted);
  let redirectTo: string | undefined;
  if (!p) {
    p = projects.find((x) => (x.previousSlugs || []).some((old) => normalizeSlug(old) === wanted));
    if (p) redirectTo = p.slug;
  }
  if (!p) return null;
  return { album: toAlbum(p), redirectTo };
}

// Every current slug AND every historical slug (from previousSlugs) needs its own static
// path -- dynamicParams=false means any path not returned here 404s outright, which would
// break old links the moment a title/slug changes. Deduped via a Set since a project's own
// current slug and its previousSlugs never overlap (saveProj() already filters that). Slugs
// are normalized (see normalizeSlug above) so the generated path always matches what
// getAlbum() will actually compare a request against.
export async function generateStaticParams() {
  const projects = await getRealProjects();
  if (projects.length === 0) return [{ slug: PLACEHOLDER_SLUG }];
  const slugs = new Set<string>();
  for (const p of projects) {
    const cur = normalizeSlug(p.slug);
    if (cur) slugs.add(cur);
    for (const old of p.previousSlugs || []) {
      const norm = normalizeSlug(old);
      if (norm) slugs.add(norm);
    }
  }
  return Array.from(slugs).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getAlbum(slug);
  if (!result) return { robots: { index: false, follow: true } };
  const { album, redirectTo } = result;
  if (redirectTo) {
    // Old slug: never index a duplicate/stub page under the retired URL -- point search
    // engines straight at the project's current canonical page instead.
    return { robots: { index: false, follow: true }, alternates: { canonical: absoluteUrl(`/work/${redirectTo}/`) } };
  }
  const coverUrl = album.bannerImage || album.coverImage || (album.media || [])[0]?.externalUrl;
  return buildMetadata({
    path: `/work/${album.slug}/`,
    title: album.seoTitle || album.projectName || album.title,
    description: album.seoDescription || album.description,
    imageUrl: coverUrl,
    ogType: "website",
  });
}

// Small label+value metadata field -- rendered inline as part of the combined
// engagement+info single-line row below. A field simply isn't pushed onto the list when its
// CMS value is empty, so nothing ever renders an empty label (per the "hide empty fields
// entirely" requirement).
type MetaField = { label: string; value: string };

// Small eyebrow used to introduce each body section (Gallery / The Story / Watch the Film /
// More Work) -- the exact same eyebrow treatment as <PageBanner/>'s own eyebrow line, just
// reused inline instead of duplicated as a new component.
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <span style={{ width: 24, height: 1, background: C.PL, display: "inline-block" }} />
      {children}
    </div>
  );
}

export default async function WorkProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, permissionEnabled, site, allProjects] = await Promise.all([
    getAlbum(slug),
    getImagePermissionEnabled(),
    getPublicSiteInfo(),
    getRealProjects(),
  ]);

  if (!result) notFound();
  const { album, redirectTo } = result;

  // Old slug hit: render a minimal, noindexed soft-redirect instead of duplicating the full
  // project content under two URLs. Kept in the site's real chrome (header/footer) so a
  // visitor landing here from an old bookmark never sees a jarring, unbranded stub.
  if (redirectTo) {
    const target = `/work/${redirectTo}/`;
    return (
      <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
        <meta httpEquiv="refresh" content={`0; url=${target}`} />
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace(${JSON.stringify(target)});` }} />
        <SiteHeader site={site} />
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.MID, textTransform: "uppercase", marginBottom: 14 }}>This project has moved</div>
          <a href={target} style={{ color: C.PL, fontSize: 16, textDecoration: "underline" }}>Continue to the current page &rarr;</a>
        </div>
        <SiteFooter site={site} />
      </main>
    );
  }

  const items = (album.media || [])
    .map((m) => ({ id: m.id, url: mediaUrl(m), orientation: m.orientation || undefined, caption: m.altText || undefined }))
    .filter((m) => m.url);

  // Hero/banner image + title fallback chain, per spec: Banner Image -> else Cover Image
  // (falling further back to the first gallery image only so the banner is never blank on a
  // project that has photos but never got a dedicated banner/cover set). Banner Title -> else
  // Title.
  const bannerImageUrl = album.bannerImage || album.coverImage || items[0]?.url;
  const bannerTitle = (album.bannerTitle || album.title || "").trim();
  const displayName = (album.projectName || album.title || "").trim();

  const metaFields: MetaField[] = [];
  if (album.clientName) metaFields.push({ label: "Client", value: album.clientName });
  if (album.location) metaFields.push({ label: "Location", value: album.location });
  if (album.projectDate) {
    metaFields.push({ label: "Date", value: new Date(album.projectDate).toLocaleDateString(undefined, { year: "numeric", month: "long" }) });
  }
  if (album.categories && album.categories.length > 0) metaFields.push({ label: "Category", value: album.categories.join(" · ") });

  // Related work: prefer other projects sharing a category with this one; fall back to the
  // next projects in CMS order when there's no category overlap (e.g. this is the only
  // project in its category). Real CMS data only -- nothing hardcoded.
  const otherProjects = allProjects.filter((p) => p.id !== album.id && p.slug);
  const sameCategory = album.categories && album.categories.length > 0
    ? otherProjects.filter((p) => p.categories?.some((c) => album.categories!.includes(c)))
    : [];
  const related = (sameCategory.length > 0 ? sameCategory : otherProjects).slice(0, 3);

  const jsonLd = creativeWorkJsonLd({
    path: `/work/${album.slug}/`,
    title: displayName,
    description: album.seoDescription || album.description,
    imageUrl: bannerImageUrl,
    dateCreated: album.projectDate,
    location: album.location,
    clientName: album.clientName,
  });

  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <script {...jsonLdScriptProps(jsonLd)} />

      <SiteHeader site={site} />

      {/* HERO / BANNER -- same visual language as the shared <PageBanner/> that every other
          inner page (Work, About, Journal, CV, Contact...) uses: dark ground, optional image
          with the identical gradient overlay, eyebrow+dash line, clamp()-sized title. Adapted
          here (not reused directly) so the "← All Work" back-link and a slightly shorter
          intro paragraph can sit inside it -- both specific to a project detail page. */}
      <div style={{ position: "relative", overflow: "hidden", background: C.DARK, minHeight: "clamp(228px,34vh,384px)", display: "flex", alignItems: "center", padding: "120px 40px 34px" }}>
        {bannerImageUrl && (
          <>
            <img src={bannerImageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,rgba(9,6,14,0.85) 0%,rgba(9,6,14,0.45) 100%)" }} />
          </>
        )}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          {/* "← All Work" back-link removed from the banner -- the picture now runs
              uninterrupted, with only the category tag + title over it. Header nav still has
              a "Work" link back to the grid. */}
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ width: 24, height: 1, background: C.PL, display: "inline-block" }} />
            {album.categories && album.categories.length > 0 ? album.categories.join(" · ") : "Portfolio"}
          </div>
          {/* Banner title -- sized clamp(16,2.5vw,31) (~20% up from the previous
              clamp(13,2.1,26)): the hero picture is still the star, this is a caption over
              it, just a touch more legible now that the description line below needs a
              title to visually anchor to. */}
          <h1 style={{ fontSize: "clamp(16px,2.5vw,31px)", fontWeight: 700, letterSpacing: 0.5, margin: 0, color: "#fff" }}>
            {bannerTitle.split("\n").map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
          {/* SHORT DESCRIPTION -- now shown once, here in the banner under the title
              (previously shown once in the body below; moved up so the banner carries the
              full title+description and the body doesn't repeat either). */}
          {album.description && (
            <p style={{ margin: "10px 0 0", maxWidth: 620, lineHeight: 1.6, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{album.description}</p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 0" }}>
        {/* ALL WORK LINK -- sits here, directly under the banner. */}
        <a href="/" style={{ color: C.MID, fontSize: 12.6, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", display: "block", textAlign: "left", marginBottom: 18 }}>&larr; All Work</a>

        {/* PROJECT TITLE + SHORT DESCRIPTION deliberately NOT repeated here -- both now live
            once, in the banner above (see hero). */}
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 24px" }}>
        {/* GALLERY -- one large hero photo + small thumbnail row, lightbox, per-image
            "Request Permission" and reel pills. */}
        <SectionEyebrow>Gallery</SectionEyebrow>
        <div style={{ marginBottom: 32 }}>
          <ProjectGallery projectId={album.id} projectName={displayName} images={items} reels={album.reels || undefined} permissionEnabled={permissionEnabled} />
        </div>

        {/* ENGAGEMENT + PROJECT INFO -- one single combined line right under the gallery:
            Like/Comment (both now real links straight out to the Google review page -- see
            ProjectEngagement's own comment), then Client / Location / Date / Category, each
            hidden entirely when the CMS field is empty. */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 56, paddingBottom: 24, borderBottom: `1px solid ${C.BORDER}`, fontSize: 13 }}>
          <ProjectEngagement projectId={album.id} compact />
          {metaFields.map((f) => (
            <span key={f.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.MID }}>
              <span style={{ opacity: 0.5 }}>·</span>
              <span style={{ color: C.PL, textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>{f.label}:</span>
              <span style={{ color: C.FG }}>{f.value}</span>
            </span>
          ))}
        </div>

        {/* FULL DESCRIPTION / STORY -- the main narrative, line breaks preserved, shown once. */}
        {album.fullDescription && (
          <div style={{ marginBottom: 56, maxWidth: 760 }}>
            <SectionEyebrow>The Story</SectionEyebrow>
            {album.fullDescription.split(/\n+/).filter((para) => para.trim()).map((para, i) => (
              <p key={i} style={{ margin: "0 0 18px", lineHeight: 1.9, color: "rgba(255,255,255,0.82)", fontSize: 16 }}>{para}</p>
            ))}
          </div>
        )}

        {/* YOUTUBE -- conditional, only rendered when a video is actually set. */}
        {album.youtubeUrl && (
          <div style={{ marginBottom: 56, maxWidth: 900 }}>
            <SectionEyebrow>Watch The Film</SectionEyebrow>
            <div style={{ aspectRatio: "16/9" }}>
              <iframe
                src={album.youtubeUrl.replace("watch?v=", "embed/")}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* RELATED PROJECTS -- real CMS projects only, no hardcoded names. Same tile
            treatment (grayscale-to-color hover, category + title overlay) as the Work grid.
            This page is a Server Component (needed for generateStaticParams/generateMetadata
            build-time data fetching), so the hover effect is done in pure CSS via the
            .related-tile classes below rather than onMouseEnter/onMouseLeave handlers --
            passing event handlers to a plain element in a Server Component is a build error
            ("Event handlers cannot be passed to Client Component props"). */}
        {related.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <style>{`
              .related-tile img { filter: grayscale(1); transition: transform 0.6s, filter 0.6s; }
              .related-tile .ov { opacity: 0; transition: opacity 0.3s; }
              .related-tile:hover img { transform: scale(1.06); filter: grayscale(0); }
              .related-tile:hover .ov { opacity: 1; }
            `}</style>
            <SectionEyebrow>More Work</SectionEyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 3 }}>
              {related.map((p) => (
                <a key={p.id} href={`/work/${p.slug}`} className="related-tile" style={{ display: "block", position: "relative", cursor: "pointer", overflow: "hidden", aspectRatio: "4/3", background: C.DARK, textDecoration: "none" }}>
                  <img src={p.coverImage || p.images?.[0]?.url || ""} alt={p.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div className="ov" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(9,6,14,0.92) 0%,transparent 55%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 22 }}>
                    <div style={{ fontSize: 10, letterSpacing: 3, color: C.PL, textTransform: "uppercase", marginBottom: 6 }}>{p.categories?.join(" · ")}</div>
                    <div style={{ fontSize: 16, letterSpacing: 1, color: "#fff" }}>{p.title}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* BOOK A PROJECT CTA */}
        <div style={{ textAlign: "center", padding: "56px 0 40px", borderTop: `1px solid ${C.BORDER}` }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>Like What You See?</div>
          <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, margin: "0 0 24px" }}>Let's Create Something Together</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <a href={`https://wa.me/${site.waNumber}?text=${encodeURIComponent(site.waMsg || "")}`} target="_blank" rel="noopener noreferrer" style={{ background: C.P, border: "none", color: C.BG, padding: "13px 36px", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>WhatsApp Now</a>
            <a href="/contact" style={{ background: "none", border: "1px solid rgba(255,255,255,0.18)", color: C.FG, padding: "13px 36px", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>Book a Project</a>
          </div>
        </div>

        {/* COPYRIGHT NOTICE */}
        <div style={{ marginTop: 8, paddingTop: 24, borderTop: `1px solid ${C.BORDER}`, fontSize: 12, color: C.MID, lineHeight: 1.7 }}>
          © {new Date().getFullYear()} Naveed Anjum / Creative Fusion LLC. All images and video on this page are protected by copyright and may not be copied, reproduced or reused without permission. Use the "Request Permission" button on any image above to ask about licensing it.
        </div>
      </div>

      <SiteFooter site={site} />
    </main>
  );
}
