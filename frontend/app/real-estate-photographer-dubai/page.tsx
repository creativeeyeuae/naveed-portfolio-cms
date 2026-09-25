import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Title/description trimmed to search-result-friendly lengths per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Real Estate Photographer in Dubai | Naveed Anjum";
const DESC =
  "Real estate photographer in Dubai for developers, agencies and owners — clean, well-lit interior and exterior photography that helps listings sell faster.";

export const metadata: Metadata = buildMetadata({
  path: "/real-estate-photographer-dubai/",
  title: TITLE,
  description: DESC,
  keywords: [
    "real estate photographer Dubai",
    "real estate photography Dubai",
    "property photographer Dubai",
    "off-plan photography Dubai",
    "villa and apartment photography UAE",
  ],
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "real-estate-photographer-dubai",
        eyebrow: "Real Estate Photography · Dubai",
        h1: "Real Estate Photographer in Dubai",
        serviceLabel: "real estate photography",
        intro:
          "Real estate photography for Dubai's fast-moving property market — clean, accurately lit interiors and exteriors that show a space the way buyers and tenants actually experience it, for listings, brochures and off-plan marketing.",
        sections: [
          {
            heading: "Photography built for how Dubai property sells",
            body:
              "Dubai's property market moves on strong visuals — from Property Finder and Bayut listings to developer brochures and off-plan marketing decks. Naveed Anjum shoots real estate photography that prioritises straight lines, true-to-life colour and natural light, so a villa, apartment or commercial unit reads as spacious, well-finished and genuinely representative of the space — not over-processed or misleading.",
          },
          {
            heading: "What a shoot covers",
            body:
              "Each booking is scoped to the property: full interior coverage room by room, exterior and façade shots, and building or community shots where relevant. Images are delivered edited and sized appropriately for listing portals, brochures and print, so the same shoot can be reused across your marketing without extra editing.",
          },
          {
            heading: "Working with agencies, developers and individual owners",
            body:
              "Clients range from individual owners photographing a single unit to agencies and developers who need consistent, on-brand imagery across a portfolio of properties. Every shoot is booked directly with Naveed — no account managers or junior shooters in between — so the person editing your images is the same person who was on site.",
          },
        ],
        faqs: [
          { q: "Which areas of Dubai and the UAE do you cover?", a: "Based in Dubai and available for real estate shoots across Dubai and the wider UAE. Send your property location when you enquire and Naveed will confirm availability." },
          { q: "How does booking work?", a: "Message on WhatsApp or email with the property details (type, size, location) and preferred date. Naveed will confirm scope, timing and pricing before the shoot is booked." },
          { q: "What's the turnaround time for edited images?", a: "Turnaround depends on the size of the shoot. Share your property details when you enquire and you'll get an accurate delivery timeline before booking." },
          { q: "Can you also film a video walkthrough of the same property?", a: "Yes — real estate videography is offered alongside photography, either as a combined booking or separately. See the real estate videographer page for details." },
          { q: "Do you shoot occupied properties as well as vacant/staged ones?", a: "Yes, both. Let Naveed know the property's condition when booking so the shoot can be planned accordingly." },
        ],
      }}
    />
  );
}
