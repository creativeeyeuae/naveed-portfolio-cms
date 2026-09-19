import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Description trimmed to a search-result-friendly length per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Brand Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Brand and advertising photographer in Dubai — visual content built around your brand identity for campaigns and marketing. Naveed Anjum, Creative Fusion.";

export const metadata: Metadata = buildMetadata({
  path: "/brand-photographer-dubai/",
  title: TITLE,
  description: DESC,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "brand-photographer-dubai",
        eyebrow: "Brand & Advertising Photography · Dubai",
        h1: "Brand Photographer in Dubai",
        serviceLabel: "brand and advertising photography",
        intro:
          "Brand and advertising photography built around a company's identity and campaign goals — imagery for marketing, social media and advertising that stays consistent with how a brand looks and communicates everywhere else.",
        sections: [
          {
            heading: "Photography aligned to your brand identity",
            body:
              "A brand shoot starts with what already defines the brand — colours, tone, existing marketing material — so the resulting images fit naturally into a company's website, ads and social channels instead of looking like a one-off shoot. Naveed Anjum works from a brief and any existing brand guidelines to keep new imagery consistent with what's already out there.",
          },
          {
            heading: "What a brand shoot covers",
            body:
              "Coverage can include campaign-style imagery for a specific launch or push, a broader batch of lifestyle and content shots for ongoing social media use, or a mix of both in one booking. Sessions are planned around the specific channels the images are for, so deliverables come sized and ready for their intended use.",
          },
          {
            heading: "Working with agencies and marketing teams",
            body:
              "Clients include marketing teams briefing a shoot directly and agencies commissioning imagery on behalf of a client brand. Either way, a clear brief, mood direction and shot list are agreed before the shoot so the day runs to plan and delivers what the campaign actually needs.",
          },
        ],
        faqs: [
          { q: "Can you work from our existing brand guidelines?", a: "Yes — share any brand guidelines, mood boards or reference imagery when you enquire and these will shape the shoot's styling and direction." },
          { q: "Can the images be used in paid advertising?", a: "Usage rights for advertising, print and other paid use are confirmed in writing before the shoot, so scope is clear from the start." },
          { q: "Do you shoot a batch of content for ongoing social media use, not just one campaign?", a: "Yes — many bookings are planned as a batch shoot covering several weeks or months of social content in a single session." },
          { q: "How does booking work for agencies commissioning on behalf of a client?", a: "Message on WhatsApp or email with the brief, brand and timeline, and Naveed will confirm scope and pricing directly with whoever is managing the project." },
          { q: "What's the turnaround time for edited images?", a: "Turnaround depends on the scope of the shoot. You'll get an accurate delivery timeline before booking." },
        ],
      }}
    />
  );
}
