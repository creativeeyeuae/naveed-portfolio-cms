import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Cormorant_Garamond, Montserrat, Oswald, Space_Grotesk, Cairo, El_Messiri, Noto_Sans_Devanagari, Noto_Nastaliq_Urdu } from "next/font/google";
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

// Curated, properly-licensed hero-typography choices (CMS > Settings > Hero Slides). Loaded
// once at build time via next/font -- self-hosted, no runtime Google Fonts request -- and
// exposed as CSS variables (fontVar) that CMS-selected values reference in inline styles.
// None of these are applied anywhere unless picked in the CMS, so adding them changes nothing
// visually on their own.
const playfairDisplay = Playfair_Display({ weight: ["400", "500", "600", "700", "800", "900"], subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const cormorantGaramond = Cormorant_Garamond({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--font-cormorant", display: "swap" });
const montserrat = Montserrat({ weight: ["300", "400", "500", "600", "700", "800", "900"], subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const oswald = Oswald({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const spaceGrotesk = Space_Grotesk({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--font-spacegrotesk", display: "swap" });
const heroFontVars = `${playfairDisplay.variable} ${cormorantGaramond.variable} ${montserrat.variable} ${oswald.variable} ${spaceGrotesk.variable}`;

// Arabic typography -- replaces the browser's generic default Arabic face (Tahoma/Arial,
// which is what every element fell back to once translated, since none of the Latin
// display fonts above carry Arabic glyphs). Cairo is a clean, modern, professional Arabic
// sans for body copy; El Messiri is a slightly more characterful display face for headings,
// matching the brand's "modern luxury" register instead of a generic UI look. Both are
// self-hosted via next/font (no runtime Google Fonts request), applied only when the site
// is in RTL/Arabic mode (globals.css), so nothing changes for English/other languages.
const cairoArabic = Cairo({ weight: ["400", "500", "600", "700"], subsets: ["arabic", "latin"], variable: "--font-arabic-body", display: "swap" });
const elMessiri = El_Messiri({ weight: ["500", "600", "700"], subsets: ["arabic", "latin"], variable: "--font-arabic-heading", display: "swap" });
// Hindi and Urdu get the same treatment as Arabic above -- Latin display fonts have no
// Devanagari or Urdu-script glyphs either, so without this they'd fall back to whatever
// generic Devanagari/Nastaliq face the visitor's OS ships. Noto Sans Devanagari is a
// clean, modern, widely-used professional face for Hindi; Noto Nastaliq Urdu renders Urdu
// in the traditional Nastaliq calligraphic style readers actually expect, rather than the
// Naskh/Arabic-style rendering a generic fallback would produce.
const notoDevanagari = Noto_Sans_Devanagari({ weight: ["400", "500", "600", "700"], subsets: ["devanagari", "latin"], variable: "--font-hindi", display: "swap" });
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-urdu", display: "swap" });
const arabicFontVars = `${cairoArabic.variable} ${elMessiri.variable} ${notoDevanagari.variable} ${notoNastaliqUrdu.variable}`;

const SITE_URL = "https://bynaveedanjum.com";
const SITE_TITLE = "Creative Fusion — Naveed Anjum | Photography & Cinematography";
const SITE_DESC =
  "Dubai-based photographer and cinematographer specializing in landscape, portrait, editorial, commercial, product, real estate, and street photography, plus commercial, documentary, fashion, automotive, and sports cinematography.";
// Same photo already used as the About-page portrait, at a wider crop for social share cards.
const OG_IMAGE = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop&q=80";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: SITE_URL,
    siteName: "Naveed Anjum — Creative Fusion",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Naveed Anjum — Photographer & Cinematographer" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [OG_IMAGE],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Naveed Anjum",
      url: SITE_URL,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
      jobTitle: ["Photographer", "Cinematographer", "Creative Director"],
      description:
        "Dubai-based photographer and cinematographer with over 20 years of experience in portrait, commercial, real estate, events and cinematography.",
      address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
      email: "creativeeyeuae@gmail.com",
      telephone: "+971581174911",
      sameAs: [
        "https://www.instagram.com/bynaveedanjum/",
        "https://youtube.com/@creativeeyeuae",
        "https://linkedin.com/in/naveedanjumch",
      ],
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE_URL}/#service`,
      name: "Naveed Anjum — Creative Fusion",
      url: SITE_URL,
      image: OG_IMAGE,
      telephone: "+971581174911",
      email: "creativeeyeuae@gmail.com",
      provider: { "@id": `${SITE_URL}/#person` },
      areaServed: [
        { "@type": "City", name: "Dubai" },
        { "@type": "Country", name: "United Arab Emirates" },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${plusJakartaSansBody.variable} ${heroFontVars} ${arabicFontVars}`}>
      <head>
        {/* Open the connection to Google's translate hosts as early as possible (DNS +
            TLS handshake) instead of waiting until the script tag is reached, so the
            widget is ready to translate sooner after a language is picked. Shaves real
            time off the one part of the delay we can control -- the rest is Google's
            own server-side translation call, which this can't speed up further. */}
        <link rel="preconnect" href="https://translate.google.com" />
        <link rel="preconnect" href="https://translate.googleapis.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://translate.google.com" />
        <link rel="dns-prefetch" href="https://translate.googleapis.com" />
      </head>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Google Website Translator (free, official, no API key) -- translates the ENTIRE
            rendered page (every CMS-authored section: hero, about, services, CV, journal,
            packages, not just the nav/buttons) into whichever language the visitor picks in
            the site's own language dropdown (page.tsx drives this widget's hidden select --
            see the `lang` effect there). The widget's own UI is hidden via globals.css;
            Naveed's site keeps its own look, Google only supplies the translation engine. */}
        <div id="google_translate_element" style={{ position: "absolute", top: -9999, left: -9999 }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `function googleTranslateElementInit(){try{new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'en,ar,fr,ru,zh-CN,de,es,it,tr,hi,ur,tl',autoDisplay:false},'google_translate_element');}catch(e){}}`,
          }}
        />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async />
        <main>{children}</main>

      </body>
    </html>
  );
}
