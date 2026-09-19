import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Title/description trimmed to search-result-friendly lengths per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Personal Branding Photographer in Dubai | Naveed Anjum";
const DESC =
  "Personal branding photographer in Dubai for entrepreneurs and professionals — authentic, on-brand images for LinkedIn and social media. Naveed Anjum.";

export const metadata: Metadata = buildMetadata({
  path: "/personal-branding-photographer-dubai/",
  title: TITLE,
  description: DESC,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "personal-branding-photographer-dubai",
        eyebrow: "Personal Branding Photography · Dubai",
        h1: "Personal Branding Photographer in Dubai",
        serviceLabel: "personal branding photography",
        intro:
          "Personal branding photography for entrepreneurs, founders, consultants and professionals building a presence in Dubai's competitive business community — images that look like you, not a stock photo, across LinkedIn, your website and social media.",
        sections: [
          {
            heading: "Photography that represents how you actually work",
            body:
              "In a market where a LinkedIn profile or a founder's Instagram often makes the first impression, generic stock imagery or a single old headshot stands out for the wrong reasons. Naveed Anjum builds a personal branding shoot around what you actually do — at your desk, in your workspace, meeting clients, presenting — so the images support the story you're already telling, rather than looking staged.",
          },
          {
            heading: "What a personal branding shoot covers",
            body:
              "Sessions typically combine a few different looks in one booking: formal portraits for a website or press kit, more relaxed working shots for social media, and environmental shots that show your workspace or industry context. Multiple outfit or setting changes can be planned into a single session, and shoots can take place at your office, a relevant Dubai location, or in a simple studio-style setup.",
          },
          {
            heading: "Built for founders, consultants and professionals",
            body:
              "Clients range from solo consultants who need a first proper set of professional images, to founders and executives refreshing their public image ahead of a launch, fundraise or new role. Every shoot is planned around how the images will actually be used — a quick brief on your goals (LinkedIn, a new website, press, speaking engagements) shapes what gets shot.",
          },
        ],
        faqs: [
          { q: "Where in Dubai can shoots take place?", a: "At your office or workspace, a relevant outdoor Dubai location, or a simple studio-style setup — whichever suits how you want the images to feel. Let Naveed know your preference when you enquire." },
          { q: "How does booking work?", a: "Message on WhatsApp or email with a short brief on what the images are for (LinkedIn, website, press) and preferred date. Naveed will confirm scope, timing and pricing before the shoot is booked." },
          { q: "How many looks or outfit changes can we fit into one session?", a: "Depends on the session length and location. Share your goals when you enquire and you'll get a realistic plan for how many looks fit into your booking." },
          { q: "What's the turnaround time for edited images?", a: "Turnaround depends on the size of the shoot. You'll get an accurate delivery timeline before booking." },
          { q: "Can these images be used for print, ads or press as well as social media?", a: "Usage rights are confirmed in writing before the shoot, so you know exactly what you can do with the images across web, print and paid use." },
        ],
      }}
    />
  );
}
