import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";

const TITLE = "Commercial Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Commercial photographer in Dubai for brands, businesses and corporate clients — product, editorial and corporate photography by Naveed Anjum, Creative Fusion.";
const URL = "https://bynaveedanjum.com/commercial-photographer-dubai";

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
        slug: "commercial-photographer-dubai",
        eyebrow: "Commercial Photography · Dubai",
        h1: "Commercial Photographer in Dubai",
        serviceLabel: "commercial photography",
        heroImage: {
          src: "https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1/object/public/portfolio/cms-uploads/1789124446277-hn5lcb8qp26.jpg",
          alt: "Commercial and corporate editorial photography by Naveed Anjum, Creative Fusion — Dubai",
        },
        intro:
          "Commercial photography for brands, businesses and corporate clients in Dubai — product, editorial and corporate imagery shot to a brand's own standards, for use across marketing, press and digital channels.",
        sections: [
          {
            heading: "Commercial work, shot to be used",
            body:
              "Commercial photography has to work for a specific purpose — a product listing, a press release, a corporate report, a campaign. Naveed Anjum's commercial and editorial work (see the 'Corporate Excellence' project above) is shot and edited with that end use front of mind, matching a brand's existing visual standards rather than imposing a generic style on every client.",
          },
          {
            heading: "What this covers",
            body:
              "Product photography, corporate portraits and team imagery, editorial-style brand storytelling, and general commercial coverage for businesses across Dubai all fall under this service — scoped individually depending on what's needed.",
          },
          {
            heading: "For businesses of any size",
            body:
              "From a small business needing product shots for e-commerce to a corporate client needing a polished editorial set for a report or press kit, bookings are scoped to the brief rather than sold as a fixed package.",
          },
        ],
        faqs: [
          { q: "What kind of commercial work do you take on?", a: "Product photography, corporate/editorial shoots, brand and team imagery, and general commercial coverage for Dubai businesses." },
          { q: "Do you shoot on location or in a studio?", a: "Both — this depends on the brief and is agreed before the shoot." },
          { q: "Can this be combined with corporate video or event coverage?", a: "Yes — video and event coverage can be booked alongside photography where relevant." },
          { q: "What's the turnaround time for edited images?", a: "Turnaround depends on the scope of the shoot. You'll get a clear delivery timeline before booking." },
          { q: "How do I request a quote?", a: "Message on WhatsApp or email with your brief (what's being shot, how many images, intended use) for a tailored quote." },
        ],
      }}
    />
  );
}
