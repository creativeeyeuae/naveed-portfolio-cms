import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";

const TITLE = "Property Videography in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Property videography in Dubai — walkthrough films, drone-style building coverage and marketing videos for developers, agencies and property owners. By Naveed Anjum, Creative Fusion.";
const URL = "https://bynaveedanjum.com/property-videography-dubai";

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
        slug: "property-videography-dubai",
        eyebrow: "Property Videography · Dubai",
        h1: "Property Videography in Dubai",
        serviceLabel: "property videography",
        intro:
          "Property videography for Dubai developments and individual listings — from single-unit walkthroughs to broader marketing footage covering a building or community, edited for how it will actually be watched: on a listing page, on social, or in a sales presentation.",
        sections: [
          {
            heading: "Video built around how a property will be marketed",
            body:
              "Every property video starts with how it's going to be used — a short vertical cut for social media, a longer walkthrough for a listing page, or a polished sales video for a developer's presentation deck. Naveed Anjum shoots and edits with that end use in mind rather than delivering one generic cut for every purpose.",
          },
          {
            heading: "What's covered",
            body:
              "Coverage can include a full unit or villa walkthrough, building exterior and amenity footage, and community-level shots for larger developments — scoped to the project during booking.",
          },
          {
            heading: "For developers, agencies and owners",
            body:
              "This service supports everything from a single owner's individual listing to a developer's ongoing marketing needs across multiple units or an entire project — each booking scoped and priced to the work involved.",
          },
        ],
        faqs: [
          { q: "What's the difference between this and real estate videography?", a: "They overlap closely — property videography covers everything from single walkthroughs to broader building/community marketing footage, while real estate videography focuses specifically on individual listing walkthroughs. Mention your project scope when you enquire and Naveed will recommend the right approach." },
          { q: "Can you deliver both a long-form video and short social cuts?", a: "Yes — this is discussed and scoped before the shoot so both formats can be delivered from one shoot day." },
          { q: "What's the turnaround time for edited video?", a: "Turnaround depends on the scope of the shoot and edit. You'll get a clear delivery timeline before booking." },
          { q: "Do you cover ongoing/ multi-unit developer projects?", a: "Yes — get in touch with your project scope for a tailored proposal covering multiple units or an entire development." },
          { q: "Which areas do you cover?", a: "Based in Dubai and available across the UAE. Share your property location when you enquire." },
        ],
      }}
    />
  );
}
