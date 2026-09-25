import { getRealProjects, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";
import WorkGrid from "@/components/work/WorkGrid";

// Real, indexable /photography page -- rebuilt from scratch to replace the old version,
// which called `lib/api.ts` (a client for the `backend/` Cloudflare Worker that was designed
// but never actually deployed -- see cmsData.ts for the same history) and always silently
// rendered empty via `.catch(()=>[])`, with no header/footer/CMS data at all.
//
// Reuses the exact same real project data and WorkGrid component /work already uses --
// no second grid system, no new content type -- just pre-filtered to the still-photography
// categories from the CMS's own category list (DEF_CATS in app/page.tsx), i.e. everything
// except the two video-oriented categories ("Cinematography", "Social Media Reels"), which
// /cinematography shows instead. A project with no categories set still shows up here rather
// than disappearing, since it can't be confirmed as video-only.
const VIDEO_CATEGORIES = ["Cinematography", "Social Media Reels"];

export async function generateMetadata() {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/photography/",
    title: `Photography — ${site.siteName}`,
    description: "Portrait, landscape, real estate, fashion, product and event photography across the UAE -- a curated look at the still-photography side of the work.",
    keywords: [
      "photographer Dubai",
      "photography Dubai",
      "commercial photography Dubai",
      "real estate photography Dubai",
      "product photography Dubai",
      "event photography Dubai",
      "lifestyle photography Dubai",
    ],
  });
}

export default async function PhotographyPage() {
  const [allProjects, site] = await Promise.all([getRealProjects(), getPublicSiteInfo()]);
  const projects = allProjects.filter(
    (p) => !p.categories?.some((c) => VIDEO_CATEGORIES.includes(c))
  );

  return (
    <InternalPageTemplate
      site={site}
      eyebrow="Photography"
      title="Photography"
      description="Portrait, landscape, real estate, fashion, product and event photography across the UAE."
    >
      {/* Links into the dedicated SEO service pages (app/<slug>/page.tsx, see
          lib/servicePagesData.ts) -- this hub is the internal-linking bridge between the
          homepage's "Photography" row and each specific service's own landing page. */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px 56px" }}>
        <h2 style={{ fontSize: 13, letterSpacing: 3, textTransform: "uppercase", color: "var(--c-mid,#A892C6)", margin: "0 0 18px" }}>
          Photography Services in Dubai
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {[
            { slug: "commercial-photographer-dubai", label: "Commercial Photography" },
            { slug: "corporate-headshot-photographer-dubai", label: "Corporate Headshots" },
            { slug: "real-estate-photographer-dubai", label: "Real Estate Photography" },
            { slug: "product-photographer-dubai", label: "Product Photography" },
            { slug: "event-photographer-dubai", label: "Event Photography" },
            { slug: "lifestyle-photographer-dubai", label: "Lifestyle Photography" },
          ].map((s) => (
            <a
              key={s.slug}
              href={`/${s.slug}`}
              style={{ fontSize: 13, color: "var(--c-pl,#E2D9F3)", textDecoration: "none", border: "1px solid var(--c-border,#2D1F45)", borderRadius: 30, padding: "9px 18px" }}
            >
              {s.label} →
            </a>
          ))}
        </div>
      </div>
      <WorkGrid projects={projects} />
    </InternalPageTemplate>
  );
}
