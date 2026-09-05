import type { Metadata } from "next";
import { DM_Serif_Display, Jost } from "next/font/google";
import "../styles/globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jost = Jost({
  weight: ["300", "400", "500", "600"],
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
    <html lang="en" className={`${dmSerifDisplay.variable} ${jost.variable}`}>
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
