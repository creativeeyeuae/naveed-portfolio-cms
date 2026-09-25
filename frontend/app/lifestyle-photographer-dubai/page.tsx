import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// New standalone SEO service page -- the one photography niche referenced on the homepage
// ("Commercial, corporate, real estate, product, events and lifestyle photography") that
// didn't yet have its own page in this system. Built with the exact same ServicePage
// component and buildMetadata() helper as the other 13 pages in this folder, so it's
// automatically cross-linked (lib/servicePagesData.ts) and automatically included in
// app/sitemap.ts -- no parallel page system, no new template.
const TITLE = "Lifestyle Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Lifestyle photographer in Dubai for brands, individuals and families — natural, editorial-style imagery for social media, marketing and personal projects, by Naveed Anjum, Creative Fusion.";
const KEYWORDS = [
  "lifestyle photographer Dubai",
  "lifestyle photography Dubai",
  "brand lifestyle photography Dubai",
  "family lifestyle photographer Dubai",
  "editorial lifestyle photography UAE",
];

export const metadata: Metadata = buildMetadata({
  path: "/lifestyle-photographer-dubai/",
  title: TITLE,
  description: DESC,
  keywords: KEYWORDS,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "lifestyle-photographer-dubai",
        eyebrow: "Lifestyle Photography · Dubai",
        h1: "Lifestyle Photographer in Dubai",
        serviceLabel: "lifestyle photography",
        // No heroImage set -- ServicePage's own brand-gradient hero band is used instead of
        // guessing at a stock or unrelated photo standing in for real lifestyle work.
        intro:
          "Lifestyle photography for brands, individuals and families in Dubai -- natural, editorial-style imagery shot in real settings rather than a studio, for use across social media, marketing and personal projects.",
        sections: [
          {
            heading: "Photography that feels natural, not staged",
            body:
              "Lifestyle photography works best when it doesn't look like a photoshoot -- genuine moments, real locations around Dubai, and a relaxed pace that lets people, families and brand ambassadors act naturally in front of the camera rather than posing stiffly for it.",
          },
          {
            heading: "What this covers",
            body:
              "Brand and influencer lifestyle content, family and personal lifestyle sessions, editorial-style imagery for social media and marketing, and location-based storytelling shoots across Dubai all fall under this service -- scoped individually depending on what's needed.",
          },
          {
            heading: "For brands and individuals",
            body:
              "From a brand needing a set of natural lifestyle images for its social channels to a family wanting an editorial-style personal session, bookings are scoped to the brief rather than sold as a fixed package.",
          },
        ],
        faqs: [
          { q: "What counts as lifestyle photography?", a: "Natural, real-setting imagery of people, families or brand ambassadors -- shot to look candid and genuine rather than posed in a studio." },
          { q: "Do you shoot on location around Dubai?", a: "Yes -- lifestyle shoots are almost always on location, at a spot that fits the brief (home, outdoors, a relevant venue)." },
          { q: "Is this suitable for brand and social media content, not just personal shoots?", a: "Yes -- lifestyle photography is booked by brands for social/marketing content as often as it is for personal or family sessions." },
          { q: "Can this be combined with video or content creation?", a: "Yes -- video and other content formats can be booked alongside a lifestyle photography session where relevant." },
          { q: "How do I request a quote?", a: "Message on WhatsApp or email with your brief (who/what's being shot, where, intended use) for a tailored quote." },
        ],
      }}
    />
  );
}
