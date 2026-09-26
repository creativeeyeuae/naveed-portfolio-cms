import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { UPCOMING_EXHIBITIONS } from "@/lib/servicePagesData";
import { buildMetadata } from "@/lib/seo";

// Title/description trimmed to search-result-friendly lengths (title ~15-60 chars,
// description ~50-160) per the SEO Agent audit; metadata now goes through the shared
// buildMetadata() helper (frontend/lib/seo.ts) instead of a hand-rolled object, so this
// page also gets a real og:image (previously missing) without duplicating that logic here.
const TITLE = "Exhibition & Trade Show Photographer Dubai | Naveed Anjum";
const DESC =
  "Exhibition and trade show stand photographer in Dubai for exhibiting companies — booth, product and delegate coverage by Naveed Anjum, Creative Fusion.";

export const metadata: Metadata = buildMetadata({
  path: "/exhibition-photographer-dubai/",
  title: TITLE,
  description: DESC,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "exhibition-photographer-dubai",
        eyebrow: "Exhibition Photography · Dubai",
        h1: "Exhibition & Trade Show Stand Photographer in Dubai",
        serviceLabel: "exhibition and trade show stand photography",
        relatedProjects: [
          { slug: "jeca-decor-global-big-5-dubai", title: "JECA Décor — Global Big 5 Dubai", image: "https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1/object/public/portfolio/cms-uploads/1789975119596-sjkqgvmzm1l.jpg", categoryLabel: "Exhibition · Dubai" },
        ],
        upcomingEvents: UPCOMING_EXHIBITIONS,
        intro:
          "Dubai hosts major international exhibitions and trade shows through the year, drawing exhibiting companies from around the world. This service covers photography of your stand, products and team on the show floor — imagery exhibitors can take home and put to work in marketing, LinkedIn posts and reports back to head office.",
        sections: [
          {
            heading: "Coverage built around a stand, not a stage",
            body:
              "Exhibition photography is a different brief from a stage or keynote shoot. The focus here is the stand itself — the setup, product displays, your team at work, conversations with visitors, and any launch moment happening at the booth — so the coverage reflects the exhibitor's own presence at the show, not just the wider event.",
          },
          {
            heading: "Short bookings around your exhibition dates",
            body:
              "Most exhibiting companies only need coverage for the days their stand is open, often as part of a short trip to Dubai. Bookings are scoped to those exhibition dates rather than sold as a fixed package, and delivery timelines are agreed before the shoot so images are ready while the show — and the story around it — is still fresh.",
          },
          {
            heading: "Across Dubai's exhibition venues",
            body:
              "Available for stands at Dubai's major exhibition venues, including Dubai World Trade Centre, Expo City Dubai and the Dubai International Convention & Exhibition Centre, for exhibitors and organisers coordinating stand photography as part of a wider show presence.",
          },
        ],
        faqs: [
          { q: "Do you photograph the whole event, or just our stand?", a: "The focus is your stand and your team's presence at the show — the booth, products, delegates and visitor interactions — rather than general coverage of the wider event." },
          { q: "We're an international company exhibiting in Dubai for a few days only — can you be booked for just that period?", a: "Yes. Bookings are scoped to your exhibition dates, which for most exhibiting companies is a short window around the show." },
          { q: "What do you deliver from an exhibition shoot?", a: "Edited photos of the stand, products, team and visitor moments, delivered digitally in a gallery you can download from." },
          { q: "Can you also film video at our stand?", a: "Yes — exhibition videography is a separate service and can be booked alongside photography for the same stand and dates." },
          { q: "How far ahead should we book for a specific exhibition?", a: "Message on WhatsApp or email with the exhibition name, dates and your hall/stand number as early as you can, since exhibition dates are fixed and availability is limited around major shows." },
        ],
      }}
    />
  );
}
