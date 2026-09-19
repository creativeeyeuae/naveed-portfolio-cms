import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { UPCOMING_EXHIBITIONS } from "@/lib/servicePagesData";
import { buildMetadata } from "@/lib/seo";

// Title/description trimmed to search-result-friendly lengths per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Exhibition & Trade Show Videographer Dubai | Naveed Anjum";
const DESC =
  "Exhibition and trade show stand videographer in Dubai for exhibiting companies — highlight reels, demos and interviews by Naveed Anjum, Creative Fusion.";

export const metadata: Metadata = buildMetadata({
  path: "/exhibition-videographer-dubai/",
  title: TITLE,
  description: DESC,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "exhibition-videographer-dubai",
        eyebrow: "Exhibition Videography · Dubai",
        h1: "Exhibition & Trade Show Stand Videographer in Dubai",
        serviceLabel: "exhibition and trade show stand videography",
        upcomingEvents: UPCOMING_EXHIBITIONS,
        intro:
          "Video coverage of your exhibition stand at Dubai's trade shows — built for exhibiting companies, including teams flying in for the show, who want a highlight reel, product demo or interview clip to bring back to head office and put out on social media once the show is over.",
        sections: [
          {
            heading: "A highlight reel exhibitors can actually use",
            body:
              "The brief for exhibition video is usually a short, shareable recap rather than a long-form film — a minute or two covering the stand, the product on display and the energy of the show floor, cut to work on LinkedIn and in a wrap-up report.",
          },
          {
            heading: "On-stand interviews and product demos",
            body:
              "Short on-camera moments filmed at the booth itself — a product demo, a spokesperson interview, a visitor testimonial — captured around your stand's own schedule so it doesn't interrupt the flow of the day.",
          },
          {
            heading: "Across Dubai's exhibition venues",
            body:
              "Available for stands at Dubai's major exhibition venues, including Dubai World Trade Centre, Expo City Dubai and the Dubai International Convention & Exhibition Centre, for exhibiting companies coordinating video coverage as part of their show presence.",
          },
        ],
        faqs: [
          { q: "Do you film the whole event, or just our stand?", a: "The focus is your stand — the booth, product demos, team and visitor moments — rather than general coverage of the wider event." },
          { q: "We're only exhibiting in Dubai for a few days — can you film for just that period?", a: "Yes. Bookings are scoped to your exhibition dates, which for most exhibiting companies is a short window around the show." },
          { q: "What do you deliver from an exhibition video shoot?", a: "An edited highlight reel and/or interview clips, sized for social media and internal use, delivered digitally." },
          { q: "Can you also photograph our stand?", a: "Yes — exhibition photography is a separate service and can be booked alongside video for the same stand and dates." },
          { q: "How far ahead should we book for a specific exhibition?", a: "Message on WhatsApp or email with the exhibition name, dates and your hall/stand number as early as you can, since exhibition dates are fixed and availability is limited around major shows." },
        ],
      }}
    />
  );
}
