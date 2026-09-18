import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import type { PublicSiteInfo } from "@/lib/cmsData";

// THE single shared template for every standalone internal page (/work, /about, /packages,
// /gear, /contact, ...). This banner is an EXACT port of the homepage SPA's own
// `function PageBanner` (app/page.tsx) -- same markup, same styling, same optional
// photo-background + gradient overlay treatment the SPA's CV/Booking/Journal/Packages/Work
// in-memory views already use via settings.sectionBg, now reaching every internal page too
// via the `image` prop.
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
  image,
  children,
}: {
  site: PublicSiteInfo;
  eyebrow: string;
  title: string;
  description?: string;
  image?: string;
  children: ReactNode;
}) {
  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <SiteHeader site={site} />

      {/* Standard internal-page banner -- identical everywhere, exact port of PageBanner. */}
      <div style={{ position: "relative", overflow: "hidden", background: C.DARK, minHeight: "clamp(252px,39.6vh,432px)", display: "flex", alignItems: "center", padding: "120px 40px 36px" }}>
        {image && <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />}
        {image && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,rgba(9,6,14,0.85) 0%,rgba(9,6,14,0.45) 100%)" }} />}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ width: 24, height: 1, background: C.PL, display: "inline-block" }} />
            {eyebrow}
          </div>
          <h1 style={{ fontSize: "clamp(32px,5.2vw,64px)", fontWeight: 700, letterSpacing: 0.5, margin: 0, color: "#fff" }}>{title}</h1>
          {description && <p style={{ maxWidth: 560, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.75)", margin: "16px 0 0" }}>{description}</p>}
        </div>
      </div>

      {/* Page-specific hero/content -- everything below the banner differs per page. */}
      {children}

      <SiteFooter site={site} />
    </main>
  );
}
