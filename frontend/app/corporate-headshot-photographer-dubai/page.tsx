import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";
import { buildMetadata } from "@/lib/seo";

// Title/description trimmed to search-result-friendly lengths per the SEO Agent audit;
// metadata now goes through the shared buildMetadata() helper so this page also gets a
// real og:image (previously missing).
const TITLE = "Corporate Headshot Photographer Dubai | Naveed Anjum";
const DESC =
  "Corporate headshot photographer in Dubai for teams and individuals — consistent, polished headshots for websites, LinkedIn and staff directories.";

export const metadata: Metadata = buildMetadata({
  path: "/corporate-headshot-photographer-dubai/",
  title: TITLE,
  description: DESC,
});

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "corporate-headshot-photographer-dubai",
        eyebrow: "Corporate Headshots · Dubai",
        h1: "Corporate Headshot Photographer in Dubai",
        serviceLabel: "corporate headshot photography",
        intro:
          "Corporate headshot photography for teams and individuals across Dubai — consistent lighting, background and framing so every headshot on your website, LinkedIn or internal directory looks like part of the same professional set.",
        sections: [
          {
            heading: "Consistent headshots your whole team can use",
            body:
              "A mismatched set of headshots — different backgrounds, lighting and crops — is one of the quickest things to make a company site or LinkedIn page look unpolished. Naveed Anjum shoots corporate headshots with a fixed, repeatable setup, so whether it's five people or fifty, every headshot matches in tone, framing and background, ready to sit side by side on a team page.",
          },
          {
            heading: "On-site at your office or in a studio-style setup",
            body:
              "Headshot sessions can run at your own office — useful for larger teams, since staff don't need to travel — or in a simple studio-style setup if you prefer a plain, controlled background. Either way, the same lighting and framing setup is used for every person to keep the whole set consistent.",
          },
          {
            heading: "Built for HR teams scheduling multiple staff",
            body:
              "For team-wide headshot days, sessions are scheduled back-to-back with short slots per person, and Naveed works directly with whoever is coordinating (HR, office manager, marketing) to build a schedule that keeps disruption to the working day to a minimum.",
          },
        ],
        faqs: [
          { q: "How many people can be photographed in one session?", a: "Team size isn't a limit — sessions are scheduled with short slots per person, so both small teams and larger groups can be booked. Share your team size when you enquire to plan the schedule." },
          { q: "On-site at our office, or in a studio?", a: "Both are available. On-site at your office works well for larger teams; a studio-style setup with a plain background is also an option if you'd prefer that look." },
          { q: "What's the turnaround time for edited headshots?", a: "Turnaround depends on the number of people photographed. You'll get an accurate delivery timeline before booking." },
          { q: "Is retouching included?", a: "Standard professional retouching (skin tone, lighting balance, minor blemishes) is part of the edit. Confirm exact scope when you enquire." },
          { q: "Can you match our brand colours or background requirements?", a: "Yes — share any brand guidelines (background colour, style) when you enquire and this can be planned into the shoot." },
        ],
      }}
    />
  );
}
