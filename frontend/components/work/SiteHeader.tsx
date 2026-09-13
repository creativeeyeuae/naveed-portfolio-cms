// Real, working site header for /work/[slug] -- this page tree is a separate Next.js route
// from the homepage's single-page-app (app/page.tsx), which has its own <Nav/> that only
// understands the SPA's in-memory `page` state, not real URLs, and is too deeply coupled to
// that state (scroll position, mobile menu, language switcher, etc.) to import here directly.
// This is a plain, static, JS-free equivalent: real <a href> links to the real routes that
// already exist (/, /photography, /cinematography, /about, /contact), so the page has a real,
// working header instead of none -- matching the dark/branded look of the rest of the site
// without duplicating the SPA's fixed-scroll-hide behaviour.
import { PublicSiteInfo } from "@/lib/cmsData";

const LINKS: [string, string][] = [
  ["/", "Home"],
  ["/photography", "Photography"],
  ["/cinematography", "Cinematography"],
  ["/about", "About"],
  ["/contact", "Contact"],
];

export default function SiteHeader({ site }: { site: PublicSiteInfo }) {
  return (
    <header style={{ background: "rgba(9,6,14,0.98)", borderBottom: "1px solid var(--border-subtle, #2D1F45)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 24px", display: "flex", justifyContent: "flex-end", gap: 18, flexWrap: "wrap" }}>
        <a href="/?admin=1" style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-muted, #A892C6)", textTransform: "uppercase", textDecoration: "none" }}>Admin</a>
        {site.instagram && <a href={site.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-muted, #A892C6)", textTransform: "uppercase", textDecoration: "none" }}>Instagram</a>}
        {site.youtube && <a href={site.youtube} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-muted, #A892C6)", textTransform: "uppercase", textDecoration: "none" }}>YouTube</a>}
      </div>
      <nav
        aria-label="Main navigation"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <a href="/" style={{ fontSize: 15, letterSpacing: 4, textTransform: "uppercase", color: "#fff", textDecoration: "none", fontFamily: "var(--font-serif), 'Plus Jakarta Sans', sans-serif" }}>
          {site.siteName}
        </a>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-muted, #A892C6)", textTransform: "uppercase", textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
