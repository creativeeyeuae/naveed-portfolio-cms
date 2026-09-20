import { getRealBlogPosts, getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";
import JournalGrid from "@/components/journal/JournalGrid";

// Real, indexable /journal index page -- previously in-memory-only (reached via
// /?page=blog inside the homepage SPA, app/page.tsx's page==="blog" view). Individual
// posts already had real URLs at /journal/[slug], but there was no real index page to
// link *to* them from outside the homepage, and Google could never crawl/index a query-
// param SPA state. Reuses the exact real post data the homepage's own Journal view reads
// (getRealBlogPosts) and the same JournalGrid card design, just given a real route.
const JOURNAL_DESCRIPTION =
  "Tips and tricks, camera settings and gear, behind-the-scenes stories and client guides -- practical notes from the field for anyone into photography and video.";

export async function generateMetadata() {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/journal/",
    title: `${site.blogBannerTitle} — ${site.siteName}`,
    description: JOURNAL_DESCRIPTION,
  });
}

export default async function JournalPage() {
  const [posts, site] = await Promise.all([getRealBlogPosts(), getPublicSiteInfo()]);

  return (
    <InternalPageTemplate
      site={site}
      eyebrow={site.blogBannerEyebrow}
      title={site.blogBannerTitle}
      description={JOURNAL_DESCRIPTION}
      image={site.blogBannerImage}
    >
      <JournalGrid posts={posts} />
    </InternalPageTemplate>
  );
}
