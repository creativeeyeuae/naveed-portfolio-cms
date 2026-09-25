import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Description trimmed to a search-result-friendly length per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Product Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Product photographer in Dubai for e-commerce and advertising — clean, accurately lit imagery that shows products the way customers expect.";

export const metadata: Metadata = buildMetadata({
  path: "/product-photographer-dubai/",
  title: TITLE,
  description: DESC,
  keywords: [
    "product photographer Dubai",
    "product photography Dubai",
    "e-commerce photography Dubai",
    "packaging photography UAE",
    "catalogue photographer Dubai",
  ],
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "product-photographer-dubai",
        eyebrow: "Product Photography · Dubai",
        h1: "Product Photographer in Dubai",
        serviceLabel: "product photography",
        intro:
          "Product photography for e-commerce, catalogues, packaging and advertising — clean studio shots and styled lifestyle imagery that show products accurately across online stores, marketplaces and print.",
        sections: [
          {
            heading: "Photography built for how products actually sell",
            body:
              "Whether a product is sold on an e-commerce site, a marketplace listing, or in a printed catalogue, accurate colour, true-to-life detail and consistent lighting matter more than a heavily stylised look. Naveed Anjum shoots product photography that shows items the way a customer will actually receive them, reducing returns and mismatched expectations.",
          },
          {
            heading: "What a product shoot covers",
            body:
              "Coverage typically includes clean studio shots on a plain or white background (for listings and catalogues), plus styled lifestyle shots that show the product in context if needed for social media or advertising. Multiple products or SKUs can be scheduled into a single booking, with images sized and formatted for the platforms they'll be used on.",
          },
          {
            heading: "Working with brands and retailers",
            body:
              "Clients range from small brands photographing a first product line to retailers needing a full catalogue shot in one session. Scope, quantity and turnaround are agreed before the shoot, so pricing is clear up front for both small and larger batches.",
          },
        ],
        faqs: [
          { q: "What kinds of products do you shoot?", a: "A wide range — from small retail products and packaging to larger items suited to on-location shooting. Share what you're photographing when you enquire and Naveed will confirm the best approach." },
          { q: "Can you do plain white-background shots for online listings?", a: "Yes — clean, consistent studio shots on a plain or white background are a standard part of product photography bookings." },
          { q: "Do you offer pricing for shooting multiple products in one session?", a: "Yes — batch/volume pricing is available for larger product sets. Share the number of items when you enquire for an accurate quote." },
          { q: "What's the turnaround time for edited product images?", a: "Turnaround depends on the number of products and images required. You'll get an accurate delivery timeline before booking." },
          { q: "Can the images be used for paid advertising as well as our website?", a: "Usage rights are confirmed in writing before the shoot, so you know exactly what you can do with the images across your website, listings and paid ads." },
        ],
      }}
    />
  );
}
