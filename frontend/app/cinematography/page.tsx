import { notFound } from "next/navigation";
import { getRealProjects, getPublicSiteInfo, getHubPageFaqs, isServicePageEnabled } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";
import WorkGrid from "@/components/work/WorkGrid";
import FaqSection from "@/components/FaqSection";

// Real, indexable /cinematography page -- rebuilt from scratch, same reasoning as
// /photography/page.tsx (see that file's comment for the full history of why the old
// version was broken). Shows every real project tagged with a video-oriented category.
const VIDEO_CATEGORIES = ["Cinematography", "Social Media Reels"];

// Real default FAQs -- editable in CMS > Service Pages ("cinematography"), same override
// pattern as every standalone service page.
const DEFAULT_FAQS = [
  { q: "What kind of video work do you take on?", a: "Cinematography, brand films, corporate video and social media reel content across the UAE." },
  { q: "Can video be booked alongside photography?", a: "Yes -- most bookings combine both where it makes sense for the brief." },
  { q: "Do you edit and deliver in vertical (reel/story) format too?", a: "Yes -- vertical/social edits are available alongside standard landscape delivery." },
  { q: "How do I request a quote for video work?", a: "Message on WhatsApp or email with your brief (what's being filmed, length, intended use) for a tailored quote." },
];

export async function generateMetadata() {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/cinematography/",
    title: `Cinematography — ${site.siteName}`,
    description: "Cinematography, brand films and social media video content across the UAE -- a curated look at the video side of the work.",
  });
}

export default async function CinematographyPage() {
  const [allProjects, site, faqs, enabled] = await Promise.all([
    getRealProjects(),
    getPublicSiteInfo(),
    getHubPageFaqs("cinematography", DEFAULT_FAQS),
    isServicePageEnabled("cinematography"),
  ]);
  if (!enabled) notFound();
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
      <FaqSection faqs={faqs} />
    </InternalPageTemplate>
  );
}
