import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";

const TITLE = "Real Estate Videographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Real estate videographer in Dubai producing cinematic property walkthroughs and listing videos for agencies, developers and owners. By Naveed Anjum, Creative Fusion.";
const URL = "https://bynaveedanjum.com/real-estate-videographer-dubai";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESC },
};

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "real-estate-videographer-dubai",
        eyebrow: "Real Estate Videography · Dubai",
        h1: "Real Estate Videographer in Dubai",
        serviceLabel: "real estate videography",
        intro:
          "Cinematic property walkthrough and listing videos for Dubai's residential and commercial market — footage that gives buyers and tenants a genuine sense of flow, scale and light before they ever step inside.",
        sections: [
          {
            heading: "Video that does what photos can't",
            body:
              "A listing video lets a viewer feel how a property flows from room to room — something a set of still photos can only imply. Naveed Anjum shoots smooth, considered walkthrough footage for Dubai properties, framed to highlight layout, natural light and finish, edited into a video ready to post on listing portals and social media.",
          },
          {
            heading: "What's covered in a shoot",
            body:
              "Coverage typically includes a full interior walkthrough, key exterior and building shots, and community or amenity footage where relevant. Final edits are delivered in formats suited to listing portals, Instagram/YouTube, and WhatsApp sharing, so the same video works across your marketing channels.",
          },
          {
            heading: "For agencies, developers and individual sellers",
            body:
              "Whether it's a single villa for an individual owner or an ongoing set of listings for an agency or developer, every video is shot and edited personally by Naveed — the same person handling your enquiry is on site for the shoot and behind the final edit.",
          },
        ],
        faqs: [
          { q: "Which areas of Dubai and the UAE do you cover?", a: "Based in Dubai and available for real estate video shoots across Dubai and the wider UAE. Share your property location when you enquire." },
          { q: "How long is a typical property walkthrough video?", a: "Length depends on the property size and how it will be used (listing portal vs. social media). Naveed will recommend a length and edit style once he knows the project." },
          { q: "What's the turnaround time for the edited video?", a: "Turnaround depends on the scope of the shoot and edit. Share your property details when you enquire for an accurate delivery timeline." },
          { q: "Can photography be booked at the same time as the video?", a: "Yes — many clients book real estate photography and videography together in one visit. See the real estate photographer page for details." },
          { q: "Do you need access arranged in advance, or can you coordinate with an agent on site?", a: "Either works. Let Naveed know who will provide access on the day (owner, tenant or agent) when you book." },
        ],
      }}
    />
  );
}
