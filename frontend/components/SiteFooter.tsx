"use client";
// THE single, real site footer. This used to exist only as inline JSX inside the homepage's
// own Home() component (app/page.tsx's `const Footer = () => (...)`) -- unreachable by any
// other page. Extracted here, byte-for-byte matching every style value of that original
// inline Footer, so every route renders the exact same component:
//
//   - The homepage (app/page.tsx) renders <SiteFooter site={...} spa={...}/> in place of its
//     old inline Footer -- passing goTo() via `spa` so Services/Quick Links/bottom-bar use
//     in-memory page switching exactly as before (100% unchanged output/behavior). Quick
//     Links labels arrive already translated (the homepage pre-translates them via its own
//     PAGE_LABEL_KEY + UI_STRINGS before passing settings.footerLinks in as site.footerLinks)
//     -- this component itself has no language/translation logic, purely presentational.
//   - Every other route (currently /work/[slug]) renders <SiteFooter site={site}/> with no
//     `spa` prop -- real <a href> links to actual routes instead of goTo().
//
// There is exactly one footer implementation. Nothing else should define its own Footer.
import { PublicSiteInfo } from "@/lib/cmsData";
import { SERVICE_PAGES } from "@/lib/servicePagesData";

// Same CSS-variable-with-fallback tokens as app/page.tsx's own `C` object and SiteHeader.tsx
// -- on the homepage these variables are set live from settings.theme; on every other route
// (no theme injection there) the literal fallback color applies directly.
const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  BORDER: "var(--c-border,#2D1F45)",
};

// Real page-key -> real URL map (used only in static mode).
// "blog" (Journal) has no standalone index route -- only individual posts (/journal/[slug])
// exist as real pages, same situation as Work/Packages/CV -- so it falls back to "/" too,
// same as those. (Was wrongly pointing at "/journal" itself, a route that doesn't exist and
// 404s under static export -- fixed, matching the identical fix already applied in
// SiteHeader.tsx's STATIC_HREF map.)
const PAGE_HREF: Record<string, string> = {
  work: "/work",
  about: "/about",
  packages: "/",
  blog: "/",
  cv: "/",
  booking: "/contact",
  contact: "/contact",
};

const mutedStyle: React.CSSProperties = { display: "block", fontSize: 13, color: C.MID, marginBottom: 10, textDecoration: "none", cursor: "pointer", transition: "color 0.2s" };
const headingStyle: React.CSSProperties = { fontSize: 10, letterSpacing: 4, color: C.PL, textTransform: "uppercase", marginBottom: 16 };
const hoverMid = { onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = C.PL), onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = C.MID) };
const hoverDark = { onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = C.PL), onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = "#2a2a3a") };
const hoverSeo = { onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = C.PL), onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = "#4a4460") };

function NoTranslate({ children }: { children: React.ReactNode }) {
  return <span translate="no" className="notranslate">{children}</span>;
}

// SPA-mode props -- supplied only by the homepage. `goTo` is the exact same in-memory page
// switcher the old inline Footer already closed over directly.
export type SiteFooterSpaProps = {
  goTo: (p: string) => void;
};

export default function SiteFooter({ site, spa }: { site: PublicSiteInfo; spa?: SiteFooterSpaProps }) {
  const waHref = `https://wa.me/${site.waNumber}?text=${encodeURIComponent(site.waMsg || "")}`;
  const quickLinks = site.footerLinks.filter((l) => site.pageEnabled[l.page] !== false);
  const bottomLinks = ["work", "about", "booking", "contact"].filter((l) => site.pageEnabled[l] !== false);

  return (
    <footer style={{ background: "#0C0817", borderTop: `1px solid ${C.BORDER}` }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 24px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 4, textTransform: "uppercase", color: C.FG, marginBottom: 12 }}><NoTranslate>{site.siteName}</NoTranslate></div>
          <p style={{ color: C.MID, fontSize: 13, lineHeight: 1.7, marginBottom: 16, maxWidth: 280 }}>{site.siteTagline}</p>
          <div style={{ fontSize: 13, color: C.MID, marginBottom: 6 }}>{site.phone}</div>
          <div style={{ fontSize: 13, color: C.MID, marginBottom: 6 }}>{site.email}</div>
          <div style={{ fontSize: 13, color: C.MID, marginBottom: 16 }}>{site.location}</div>
          <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ background: C.P, border: "none", color: C.BG, padding: "8px 20px", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", borderRadius: 2, textDecoration: "none", display: "inline-block" }}>{site.footerWhatsappBtn}</a>
        </div>

        <div>
          <div style={headingStyle}>Services</div>
          {site.services.map((sv) =>
            spa ? (
              <div key={sv.id} onClick={() => spa.goTo("work")} style={mutedStyle} {...hoverMid}>{sv.title}</div>
            ) : (
              <a key={sv.id} href="/" style={mutedStyle} {...hoverMid}>{sv.title}</a>
            )
          )}
        </div>

        <div>
          <div style={headingStyle}>Quick Links</div>
          {quickLinks.map((l, i) =>
            spa ? (
              <div key={i} onClick={() => spa.goTo(l.page)} style={mutedStyle} {...hoverMid}>{l.label}</div>
            ) : (
              <a key={i} href={PAGE_HREF[l.page] || "/"} style={mutedStyle} {...hoverMid}>{l.label}</a>
            )
          )}
          {/* Real route, not part of any in-memory SPA page -- always a plain <a href>
              in both spa and static mode, same reasoning as the SERVICE_PAGES links below. */}
          <a href="/gear" style={mutedStyle} {...hoverMid}>Gear</a>
        </div>

        <div>
          <div style={headingStyle}>Follow</div>
          {site.instagram && <a href={site.instagram} target="_blank" rel="noopener noreferrer" style={mutedStyle} {...hoverMid}>Instagram</a>}
          {site.youtube && <a href={site.youtube} target="_blank" rel="noopener noreferrer" style={mutedStyle} {...hoverMid}>YouTube</a>}
          {site.linkedin && <a href={site.linkedin} target="_blank" rel="noopener noreferrer" style={mutedStyle} {...hoverMid}>LinkedIn</a>}
          {site.tiktok && <a href={site.tiktok} target="_blank" rel="noopener noreferrer" style={{ ...mutedStyle, marginBottom: 0 }} {...hoverMid}>TikTok</a>}
        </div>
      </div>

      {/* Real, plain <a href> links (not goTo()) to the standalone SEO service pages -- these
          are real routes outside the homepage's in-memory pages, so they stay <a href> in
          both spa and static mode, letting search engines crawl and follow them either way. */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 28px", display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
        {SERVICE_PAGES.map((s) => (
          <a key={s.slug} href={`/${s.slug}`} style={{ fontSize: 11, letterSpacing: 0.5, color: "#4a4460", textDecoration: "none", transition: "color 0.2s" }} {...hoverSeo}>{s.label} Dubai</a>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.BORDER}`, padding: "16px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#2a2a3a", textTransform: "uppercase" }}>{site.footerCopyright}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {bottomLinks.map((l) =>
            spa ? (
              <span key={l} onClick={() => spa.goTo(l)} style={{ fontSize: 10, letterSpacing: 2, color: "#2a2a3a", textTransform: "uppercase", cursor: "pointer", transition: "color 0.2s" }} {...hoverDark}>{l}</span>
            ) : (
              <a key={l} href={PAGE_HREF[l] || "/"} style={{ fontSize: 10, letterSpacing: 2, color: "#2a2a3a", textTransform: "uppercase", textDecoration: "none", transition: "color 0.2s" }} {...hoverDark}>{l}</a>
            )
          )}
        </div>
      </div>
    </footer>
  );
}
