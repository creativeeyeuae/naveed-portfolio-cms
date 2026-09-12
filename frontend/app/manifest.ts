import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Makes the site installable ("Add to Home Screen") on both Android and iOS.
// Two real reasons to have this, not just polish:
//  1. It gives the site a real app icon + full-screen (no browser bars) launch --
//     for visitors and for Naveed alike.
//  2. Apple *requires* a site to be installed to the Home Screen before it will allow
//     Web Push notifications in Safari on iPhone -- so this is also what makes the
//     admin push-notification toggle (CMS > Admin & Access) actually work on iOS.
// Next.js auto-generates /manifest.webmanifest from this file and links it in <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Creative Fusion — Naveed Anjum",
    short_name: "Creative Fusion",
    description:
      "Dubai-based photography & cinematography by Naveed Anjum — portfolio, bookings, and journal.",
    start_url: "/",
    display: "standalone",
    background_color: "#140D21",
    theme_color: "#140D21",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
