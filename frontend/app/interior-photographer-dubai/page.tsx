import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Description trimmed to a search-result-friendly length per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Interior Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Interior photographer in Dubai for homes, hospitality, retail and commercial interiors — light, composition and styling captured accurately.";

export const metadata: Metadata = buildMetadata({
  path: "/interior-photographer-dubai/",
  title: TITLE,
  description: DESC,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "interior-photographer-dubai",
        eyebrow: "Interior Photography · Dubai",
        h1: "Interior Photographer in Dubai",
        serviceLabel: "interior photography",
        intro:
          "Interior photography for homes, hospitality venues, retail spaces and commercial interiors across Dubai — capturing how a space is designed to feel, not just how it looks in a wide-angle snapshot.",
        sections: [
          {
            heading: "Interiors shot for design, light and detail",
            body:
              "Interior work is about more than fitting a room in frame — it's controlling perspective, working with (or supplementing) available light, and giving finishes, materials and styling their due. Naveed Anjum approaches every interior shoot this way, whether it's a private residence, a hospitality space, a showroom or a retail fit-out.",
          },
          {
            heading: "Who this is for",
            body:
              "Interior designers and architects documenting a completed project, hospitality and F&B venues wanting imagery for their own marketing, retail brands needing store or showroom photography, and homeowners wanting their space professionally captured all fall under this service.",
          },
          {
            heading: "Deliverables",
            body:
              "Final images are colour-corrected and retouched, delivered at resolutions suitable for print, web and social media, so the same set of photos can be used across a portfolio, website or press submission without further editing.",
          },
        ],
        faqs: [
          { q: "What types of interiors do you photograph?", a: "Private residences, hospitality and F&B venues, retail and showroom spaces, and commercial interiors across Dubai." },
          { q: "Do you bring your own lighting, or work with available light?", a: "Both, depending on the space and the look you want — this is discussed and agreed before the shoot." },
          { q: "How long does a typical interior shoot take?", a: "It depends on the number of rooms/areas and the level of detail required. Share your space and goals when you enquire for a time estimate." },
          { q: "Can this be paired with architectural or real estate photography?", a: "Yes — many interior shoots are booked alongside architectural photography or real estate photography for a complete set of imagery." },
          { q: "What's the turnaround time for edited photos?", a: "Turnaround depends on shoot size. You'll get a clear delivery timeline before booking." },
        ],
      }}
    />
  );
}
