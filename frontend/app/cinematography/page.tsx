import { getRealProjects, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";
import WorkGrid from "@/components/work/WorkGrid";

// Real, indexable /cinematography page -- rebuilt from scratch, same reasoning as
// /photography/page.tsx (see that file's comment for the full history of why the old
// version was broken). Shows every real project tagged with a video-oriented category.
const VIDEO_CATEGORIES = ["Cinematography", "Social Media Reels"];

export async function generateMetadata() {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/cinematography/",
    title: `Cinematography — ${site.siteName}`,
    description: "Cinematography, brand films and social media video content across the UAE -- a curated look at the video side of the work.",
  });
}

export default async function CinematographyPage() {
  const [allProjects, site] = await Promise.all([getRealProjects(), getPublicSiteInfo()]);
  const projects = allProjects.filter((p) =>
    p.categories?.some((c) => VIDEO_CATEGORIES.includes(c))
  );

  return (
    <InternalPageTemplate
      site={site}
      eyebrow="Cinematography"
      title="Cinematography"
      description="Cinematography, brand films and social media video content across the UAE."
    >
      <WorkGrid projects={projects} />
    </InternalPageTemplate>
  );
}
