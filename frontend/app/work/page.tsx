import type { Metadata } from "next";
import { getRealProjects, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WorkGrid from "@/components/work/WorkGrid";

// Real, indexable /work index page -- every real project (not just the homepage's featured
// picks), reusing the same card grid design as the homepage's own all-projects Work view
// (app/page.tsx, page==="work" -- that view already shows every project with a category
// filter, it just has no real URL of its own, client SPA state only). Same shared
// SiteHeader/SiteFooter + hero visual language as /work/[slug] and /about. No second design
// system, no invented content.
const C = {
  FG: "var(--c-fg,#FFFFFF)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  DARK: "var(--c-dark,#140D21)",
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/work/",
    title: `${site.workBannerTitle} — ${site.siteName}`,
    description: "A curated selection of photography and cinematography work across the UAE -- brand campaigns, weddings, real estate and editorial, all in one place.",
  });
}

export default async function WorkIndexPage() {
  const [projects, site] = await Promise.all([getRealProjects(), getPublicSiteInfo()]);

  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <SiteHeader site={site} />

      {/* HERO -- same visual language as the shared PageBanner (app/page.tsx) and the
          static /about page's own hero. */}
      <div style={{ background: C.DARK, padding: "120px 40px 36px", minHeight: "clamp(252px,39.6vh,432px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: C.PL }} />
          {site.workBannerEyebrow}
        </div>
        <h1 style={{ fontSize: "clamp(32px,5.2vw,64px)", fontWeight: 700, margin: "0 0 16px", maxWidth: 800 }}>{site.workBannerTitle}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 620, margin: 0 }}>
          A curated selection of photography and cinematography work across the UAE -- brand campaigns, weddings, real estate and editorial, all in one place.
        </p>
      </div>

      <WorkGrid projects={projects} />

      <SiteFooter site={site} />
    </main>
  );
}
