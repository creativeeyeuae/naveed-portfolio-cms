import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import type { PublicSiteInfo } from "@/lib/cmsData";

// THE single shared template for every standalone internal page (/work, /about, /packages,
// /gear, /contact, ...). Ports the exact PageBanner reference implementation from the
// homepage SPA (app/page.tsx's `function PageBanner`) so every internal page gets byte-for-
// byte the same header, banner height/padding/typography, spacing and footer -- only the
// eyebrow/title/description (banner) and the page-specific body (children) differ per page.
// This does not replace SiteHeader/SiteFooter (still the single real nav/footer); it just
// wraps them + the shared banner so no page hand-duplicates that banner markup anymore.
const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

export default function InternalPageTemplate({
  site,
  eyebrow,
  title,
  description,
  children,
}: {
  site: PublicSiteInfo;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <SiteHeader site={site} />

      {/* Standard internal-page banner -- identical on every internal page. */}
      <div style={{ background: C.DARK, padding: "120px 40px 36px", minHeight: "clamp(252px,39.6vh,432px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: C.PL }} />
          {eyebrow}
        </div>
        <h1 style={{ fontSize: "clamp(32px,5.2vw,64px)", fontWeight: 700, margin: description ? "0 0 16px" : 0, maxWidth: 800 }}>{title}</h1>
        {description && <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", maxWidth: 620, margin: 0 }}>{description}</p>}
      </div>

      {/* Page-specific hero/content -- everything below the banner differs per page. */}
      {children}

      <SiteFooter site={site} />
    </main>
  );
}
