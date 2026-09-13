import type { Metadata } from "next";
import ServicePage from "@/components/ServicePage";

const TITLE = "Architectural Photographer in Dubai | Naveed Anjum — Creative Fusion";
const DESC =
  "Architectural photographer in Dubai capturing buildings, façades and skylines with clean lines and controlled perspective, for architects, developers and design studios. By Naveed Anjum, Creative Fusion.";
const URL = "https://bynaveedanjum.com/architectural-photographer-dubai";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESC, url: URL, type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESC },
};

export default function Page() {
  return (
    <ServicePage
      data={{
        slug: "architectural-photographer-dubai",
        eyebrow: "Architectural Photography · Dubai",
        h1: "Architectural Photographer in Dubai",
        serviceLabel: "architectural photography",
        intro:
          "Architectural photography across Dubai's skyline and built environment — buildings, façades and structural details shot with straight lines, controlled perspective and an eye for how light moves across a form through the day.",
        sections: [
          {
            heading: "Documenting buildings as they're designed to be seen",
            body:
              "Good architectural photography respects the building's own lines — verticals kept vertical, perspective controlled, and the shot timed for the light that shows the structure at its best. Naveed Anjum shoots exteriors, façades and structural details across Dubai with that discipline, for architects, developers and design studios who need their finished work represented accurately.",
          },
          {
            heading: "Who this serves",
            body:
              "Architecture firms documenting completed projects for their portfolio, developers needing exterior imagery for marketing, and design studios wanting professional coverage of a building's exterior all fall under this service.",
          },
          {
            heading: "Deliverables",
            body:
              "Edited images are delivered at resolutions suitable for portfolios, award submissions, press and print, so the same shoot can support multiple uses without re-editing.",
          },
        ],
        faqs: [
          { q: "Do you shoot at specific times of day for the best light?", a: "Yes — timing (including golden hour or twilight, where useful) is planned around the building's orientation and the look you want." },
          { q: "Can you shoot a building's exterior and its interiors in one booking?", a: "Yes — architectural photography is often paired with interior photography for full project coverage. See the interior photographer page for details." },
          { q: "Do you need permission/access arranged for a shoot?", a: "Site access is the client's responsibility to arrange; let Naveed know what's already confirmed when booking." },
          { q: "What's the turnaround time for edited images?", a: "Turnaround depends on the size of the shoot. You'll get a clear delivery timeline before booking." },
          { q: "Do you cover locations outside Dubai?", a: "Based in Dubai and available for architectural photography across the wider UAE — share your project location when you enquire." },
        ],
      }}
    />
  );
}
