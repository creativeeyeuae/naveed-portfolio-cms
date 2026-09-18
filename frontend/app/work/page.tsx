import type { Metadata } from "next";
import { getRealProjects, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";
import WorkGrid from "@/components/work/WorkGrid";

// Real, indexable /work index page -- every real project (not just the homepage's featured
// picks), reusing the same card grid design as the homepage's own all-projects Work view
// (app/page.tsx, page==="work" -- that view already shows every project with a category
// filter, it just has no real URL of its own, client SPA state only). Same shared
// SiteHeader/SiteFooter + hero visual language as /work/[slug] and /about. No second design
// system, no invented content.

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
    <InternalPageTemplate
      site={site}
      eyebrow={site.workBannerEyebrow}
      title={site.workBannerTitle}
      description="A curated selection of photography and cinematography work across the UAE -- brand campaigns, weddings, real estate and editorial, all in one place."
      image={site.workBannerImage}
    >
      <WorkGrid projects={projects} />
    </InternalPageTemplate>
  );
}
