import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";

// "Sharjah" (the shamsfz.ae brand typeface) isn't a licensed font we can source --
// it only turns up on unlicensed font-aggregator sites, not Google Fonts or any
// legitimate foundry, and it also appears to be Shams Free Zone's own commissioned
// corporate face rather than a general-purpose typeface. Plus Jakarta Sans is used
// here instead: a single, properly-licensed geometric sans across every weight the
// brief calls for (Light/Regular/Medium/Bold), applied as one family for both
// headings and body copy exactly as specified.
const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const plusJakartaSansBody = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Creative Fusion — Naveed Anjum | Photography & Cinematography",
  description:
    "Dubai-based photographer and cinematographer specializing in landscape, portrait, editorial, commercial, product, real estate, and street photography, plus commercial, documentary, fashion, automotive, and sports cinematography.",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://bynaveedanjum.com/#person",
      name: "Naveed Anjum",
      url: "https://bynaveedanjum.com",
      jobTitle: ["Photographer", "Cinematographer", "Creative Director"],
      description:
        "Dubai-based photographer and cinematographer with over 20 years of experience in portrait, commercial, real estate, events and cinematography.",
      address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
      sameAs: ["https://instagram.com/creativeeyeuae", "https://youtube.com/@creativeeyeuae"],
    },
    {
      "@type": "ProfessionalService",
      "@id": "https://bynaveedanjum.com/#service",
      name: "Naveed Anjum — Creative Fusion",
      url: "https://bynaveedanjum.com",
      provider: { "@id": "https://bynaveedanjum.com/#person" },
      areaServed: [
        { "@type": "City", name: "Dubai" },
        { "@type": "Country", name: "United Arab Emirates" },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${plusJakartaSansBody.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <main>{children}</main>

      </body>
    </html>
  );
}
