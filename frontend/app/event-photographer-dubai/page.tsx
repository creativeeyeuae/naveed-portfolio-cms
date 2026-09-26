import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Description trimmed to a search-result-friendly length per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Event Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Event photographer in Dubai for corporate events, launches and conferences — candid and formal coverage delivered fast. Naveed Anjum.";

export const metadata: Metadata = buildMetadata({
  path: "/event-photographer-dubai/",
  title: TITLE,
  description: DESC,
  keywords: [
    "event photographer Dubai",
    "corporate event photography Dubai",
    "conference photographer Dubai",
    "product launch photographer Dubai",
    "event photography UAE",
  ],
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "event-photographer-dubai",
        eyebrow: "Event Photography · Dubai",
        h1: "Event Photographer in Dubai",
        serviceLabel: "event photography",
        relatedProjects: [
          { slug: "world-investment-conference", title: "World Investment Conference", image: "https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1/object/public/portfolio/cms-uploads/1789355853161-17h3bcrbzo.jpg", categoryLabel: "Event · Dubai" },
          { slug: "kyprqs-nicolaides", title: "Kyprqs Nicolaides", image: "https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1/object/public/portfolio/cms-uploads/1789997520080-8w3e05l4erl.jpg", categoryLabel: "Event · Dubai" },
        ],
        intro:
          "Event photography for corporate events, product launches, conferences and private functions across Dubai — candid coverage of the room alongside the formal shots a client actually needs, delivered on a timeline that fits the event.",
        sections: [
          {
            heading: "Photography built for Dubai's event calendar",
            body:
              "From corporate conferences and product launches to private functions, Dubai's event calendar moves fast and often needs images turned around quickly for same-day or next-day sharing. Naveed Anjum covers events end to end — arrivals, key moments, speakers, candid crowd shots and formal group shots — so clients get a complete, usable set rather than just posed photos.",
          },
          {
            heading: "What event coverage includes",
            body:
              "A typical booking covers the full run of an event: setup and arrival shots, key moments (speeches, launches, presentations), candid coverage of guests and atmosphere, and any formal or group shots requested. Coverage length and scope are agreed in advance based on the event's schedule.",
          },
          {
            heading: "Working with event planners and corporate teams",
            body:
              "Clients include event planners booking coverage for a client's event and corporate teams booking directly for their own launches, conferences and functions. A short run sheet or agenda ahead of the event helps make sure the key moments are covered without missing anything.",
          },
        ],
        faqs: [
          { q: "What types of events do you cover?", a: "Corporate events, conferences, product launches and private functions across Dubai and the wider UAE. Share your event type and date when you enquire." },
          { q: "Can you turn around images quickly for same-day sharing?", a: "Fast turnaround for a select set of images can be arranged for time-sensitive events — mention this when booking so it can be planned into the coverage." },
          { q: "Can you cover a large event with multiple photographers?", a: "For larger events needing multiple angles or simultaneous coverage, this can be arranged — share your event size and needs when you enquire." },
          { q: "Do you also offer video coverage of the same event?", a: "Yes — event videography/cinematography can be added alongside photography, either as a combined booking or separately." },
          { q: "How far in advance should we book?", a: "As early as possible, especially during Dubai's busier event season — but message with your date and Naveed will confirm availability." },
        ],
      }}
    />
  );
}
