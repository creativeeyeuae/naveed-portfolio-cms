// Real, working site footer for /work/[slug] -- same rationale as SiteHeader.tsx: a plain,
// static equivalent of the homepage SPA's <Footer/>, built from real <a href> links instead
// of that component's in-memory goTo() page switches, since this page tree has real URLs.
import { PublicSiteInfo } from "@/lib/cmsData";

const QUICK_LINKS: [string, string][] = [
  ["/", "Home"],
  ["/photography", "Photography"],
  ["/cinematography", "Cinematography"],
  ["/about", "About"],
  ["/contact", "Contact"],
];

export default function SiteFooter({ site }: { site: PublicSiteInfo }) {
  return (
    <footer style={{ background: "#0C0817", borderTop: "1px solid var(--border-subtle, #2D1F45)", marginTop: 40 }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px 24px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 14, letterSpacing: 4, textTransform: "uppercase", color: "#fff", marginBottom: 12 }}>{site.siteName}</div>
          <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 13, lineHeight: 1.7, marginBottom: 16, maxWidth: 320 }}>{site.siteTagline}</p>
          <div style={{ fontSize: 13, color: "var(--text-muted, #A892C6)", marginBottom: 6 }}>{site.phone}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted, #A892C6)", marginBottom: 6 }}>{site.email}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted, #A892C6)" }}>{site.location}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "var(--accent-primary, #8B5CF6)", textTransform: "uppercase", marginBottom: 16 }}>Quick Links</div>
          {QUICK_LINKS.map(([href, label]) => (
            <a key={href} href={href} style={{ display: "block", fontSize: 13, color: "var(--text-muted, #A892C6)", marginBottom: 10, textDecoration: "none" }}>
              {label}
            </a>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "var(--accent-primary, #8B5CF6)", textTransform: "uppercase", marginBottom: 16 }}>Follow</div>
          {site.instagram && <a href={site.instagram} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 13, color: "var(--text-muted, #A892C6)", marginBottom: 10, textDecoration: "none" }}>Instagram</a>}
          {site.youtube && <a href={site.youtube} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 13, color: "var(--text-muted, #A892C6)", marginBottom: 10, textDecoration: "none" }}>YouTube</a>}
          {site.linkedin && <a href={site.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 13, color: "var(--text-muted, #A892C6)", textDecoration: "none" }}>LinkedIn</a>}
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-subtle, #2D1F45)", padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#4a4460", textTransform: "uppercase" }}>{site.footerCopyright}</div>
      </div>
    </footer>
  );
}
