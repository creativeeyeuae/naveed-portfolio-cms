import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

const TITLE = "Fashion Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Fashion photographer in Dubai for runway shows, designer showcases and editorial fashion coverage — real event work including the Nemara Fashion Show. Naveed Anjum.";

export const metadata: Metadata = buildMetadata({
  path: "/fashion-photographer-dubai/",
  title: TITLE,
  description: DESC,
  keywords: [
    "fashion photographer Dubai",
    "fashion show photographer Dubai",
    "runway photographer Dubai",
    "designer showcase photographer UAE",
    "fashion event photography Dubai",
  ],
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "fashion-photographer-dubai",
        eyebrow: "Fashion Photography · Dubai",
        h1: "Fashion Photographer in Dubai",
        serviceLabel: "fashion photography",
        relatedProjects: [
          { slug: "nemara-fashion-show-2", title: "Nemara Fashion Show", image: "https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1/object/public/portfolio/cms-uploads/1790090874391-8y6o37nyky6.jpg", categoryLabel: "Fashion · Dubai" },
        ],
        intro:
          "Fashion photography for runway shows, designer showcases and fashion events in Dubai — coverage built around styling, movement and the model's presence on the night, alongside the composed, editorial-style images a designer or brand can use afterwards.",
        sections: [
          {
            heading: "Real fashion event coverage, not a studio simulation",
            body:
              "Naveed Anjum's fashion work includes shooting the Nemara Fashion Show at Tacenda Lounge, Dubai Marriott Harbour, where the coverage centred on international supermodel Shayma Latresh — her styling, expressions and presence through the show. That event work sits alongside carefully composed, editorial-style images, giving designers and event organisers both the natural, in-the-moment shots and the polished stills they need for press and social use.",
          },
          {
            heading: "What fashion coverage includes",
            body:
              "Runway walks, backstage and styling moments, designer and model portraits, and candid audience or front-row shots can all be covered depending on the event, agreed in advance with the organiser or designer.",
          },
          {
            heading: "Who this is for",
            body:
              "Fashion designers and labels showing at a Dubai event, event organisers running a fashion show or showcase, and PR or marketing teams who need usable imagery quickly after the event for press and social channels.",
          },
        ],
        faqs: [
          { q: "Have you covered a fashion show in Dubai before?", a: "Yes — including the Nemara Fashion Show at Tacenda Lounge, Dubai Marriott Harbour, featuring supermodel Shayma Latresh." },
          { q: "Do you shoot both runway and backstage?", a: "Both can be covered depending on venue access and what the organiser or designer needs — this is agreed before the event." },
          { q: "Can you turn images around quickly for press or social media?", a: "A fast-turnaround set of key images can be arranged for time-sensitive press or social needs — mention this when booking." },
          { q: "Do you offer video coverage of fashion shows as well?", a: "Yes — fashion show videography/cinematography can be added alongside photography as a combined booking." },
          { q: "How do we book you for a fashion event?", a: "Message with your event date, venue and what you need covered, and Naveed will confirm availability and scope." },
        ],
      }}
    />
  );
}
