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
      <WorkGrid projects={projects} />
    </InternalPageTemplate>
  );
}
