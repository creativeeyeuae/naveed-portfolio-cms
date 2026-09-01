import type { Metadata } from "next";
import "../styles/globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Creative Fusion — Naveed Anjum | Photography & Cinematography",
  description:
    "Dubai-based photographer and cinematographer specializing in landscape, portrait, editorial, commercial, product, real estate, and street photography, plus commercial, documentary, fashion, automotive, and sports cinematography.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
