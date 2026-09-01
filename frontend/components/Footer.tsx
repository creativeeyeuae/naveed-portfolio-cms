"use client";

import { usePathname } from "next/navigation";

// Footer renders only on the Contact page, per established design convention.
export function Footer() {
  const pathname = usePathname();
  if (pathname !== "/contact") return null;

  return (
    <footer className="border-t border-white/10 bg-ink px-6 py-10 text-center text-sm text-white/60">
      <p>© {new Date().getFullYear()} Creative Fusion — Naveed Anjum. All rights reserved.</p>
      <p className="mt-2">
        <a href="https://wa.me/971581174911" className="hover:text-gold">
          WhatsApp: +971 58 117 4911
        </a>
      </p>
    </footer>
  );
}
