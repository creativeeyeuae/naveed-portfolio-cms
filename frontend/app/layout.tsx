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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${jost.variable}`}>
      <body className="font-sans antialiased">

        <main>{children}</main>

      </body>
    </html>
  );
}
