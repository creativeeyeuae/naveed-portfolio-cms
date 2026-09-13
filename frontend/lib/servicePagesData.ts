// Shared registry of every standalone SEO service page -- single source of truth used for
// cross-linking (each page links to the others) and for app/sitemap.ts. Add a row here
// whenever a new /xxx-dubai/ page is added later so it's automatically cross-linked + listed.
export const SERVICE_PAGES: { slug: string; label: string }[] = [
  { slug: "real-estate-photographer-dubai", label: "Real Estate Photographer" },
  { slug: "real-estate-videographer-dubai", label: "Real Estate Videographer" },
  { slug: "interior-photographer-dubai", label: "Interior Photographer" },
  { slug: "architectural-photographer-dubai", label: "Architectural Photographer" },
  { slug: "property-videography-dubai", label: "Property Videography" },
  { slug: "commercial-photographer-dubai", label: "Commercial Photographer" },
  { slug: "exhibition-photographer-dubai", label: "Exhibition Photographer" },
  { slug: "exhibition-videographer-dubai", label: "Exhibition Videographer" },
  { slug: "personal-branding-photographer-dubai", label: "Personal Branding Photographer" },
  { slug: "corporate-headshot-photographer-dubai", label: "Corporate Headshot Photographer" },
  { slug: "product-photographer-dubai", label: "Product Photographer" },
  { slug: "brand-photographer-dubai", label: "Brand Photographer" },
  { slug: "event-photographer-dubai", label: "Event Photographer" },
];

// Real, sourced upcoming Dubai exhibitions/trade shows -- shown on the exhibition-
// photographer/videographer pages. Dates confirmed as of Sep 2026 from the organisers'
// own sites and Gulf News' DWTC 2026 calendar coverage. THIS LIST GOES STALE: revisit and
// update every few months, remove events once they've passed, and never add an event here
// without a source confirming its date -- do not guess or carry a date forward from memory.
export const UPCOMING_EXHIBITIONS: { name: string; dates: string; venue: string }[] = [
  { name: "Beautyworld Middle East", dates: "Oct 6–8, 2026", venue: "Dubai World Trade Centre" },
  { name: "Airport Show", dates: "Oct 12–14, 2026", venue: "Dubai World Trade Centre" },
  { name: "WETEX", dates: "Oct 20–22, 2026", venue: "Dubai World Trade Centre" },
  { name: "Automechanika Dubai", dates: "Nov 10–12, 2026", venue: "Dubai Exhibition Centre, Expo City" },
  { name: "Big 5 Global", dates: "Nov 23–26, 2026", venue: "Dubai World Trade Centre" },
  { name: "GITEX Global", dates: "Dec 7–11, 2026", venue: "Dubai World Trade Centre" },
  { name: "WHX Dubai (formerly Arab Health)", dates: "Jan 25–28, 2027", venue: "DWTC & Dubai Exhibition Centre" },
];
