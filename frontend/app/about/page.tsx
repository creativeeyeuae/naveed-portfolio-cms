import type { Metadata } from "next";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Real, indexable static route (/about) -- previously a bare, unstyled legacy stub (no
// SiteHeader/SiteFooter, no CMS data, disconnected Tailwind classes, from an earlier phase
// of the project) confirmed live/broken by the site owner. Rewritten to reuse the exact real
// About content the homepage SPA's own About page-view already renders (app/page.tsx,
// page==="about"), sourced from the same CMS fields via getPublicSiteInfo(), and the same
// shared SiteHeader/SiteFooter + PageBanner-style visual language as /work/[slug]. No second
// design system, no invented content -- and no change to app/page.tsx's own in-memory About
// section, which keeps working exactly as before.
const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/about/",
    title: `About — ${site.siteName}`,
    description: site.aboutBio,
    ogType: "profile",
  });
}

export default async function AboutPage() {
  const site = await getPublicSiteInfo();

  return (
    <main style={{ background: C.BG, color: C.FG, minHeight: "100vh" }}>
      <style>{`
        .about-grid { display:grid; grid-template-columns:1.1fr 0.9fr; gap:56px; align-items:start; }
        @media (max-width: 780px) { .about-grid { grid-template-columns: 1fr; } }
      `}</style>
      <SiteHeader site={site} />

      {/* HERO -- same visual language as the shared PageBanner (app/page.tsx) */}
      <div style={{ background: C.DARK, padding: "120px 40px 36px", minHeight: "clamp(252px,39.6vh,432px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: C.PL }} />
          {site.aboutBannerEyebrow}
        </div>
        <h1 style={{ fontSize: "clamp(32px,5.2vw,64px)", fontWeight: 700, margin: 0, maxWidth: 800 }}>{site.aboutBannerTitle}</h1>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 40px" }}>
        <div className="about-grid">
          {/* LEFT: bio */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>About</div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 700, margin: "0 0 8px" }}>{site.aboutName}</h2>
            <p style={{ fontSize: 15, color: C.MID, margin: "0 0 22px" }}>{site.aboutTitle}</p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.78)", margin: "0 0 28px" }}>{site.aboutBio}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32, fontSize: 14, color: C.MID }}>
              {site.phone && <div>📞 {site.phone}</div>}
              {site.email && <div>✉️ {site.email}</div>}
              {site.location && <div>📍 {site.location}</div>}
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
              <a href="/contact" style={{ background: C.P, color: C.BG, padding: "13px 32px", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>Book Now</a>
              <a href={`https://wa.me/${site.waNumber}?text=${encodeURIComponent(site.waMsg || "")}`} target="_blank" rel="noopener noreferrer" style={{ background: "none", border: `1px solid ${C.BORDER}`, color: C.FG, padding: "13px 32px", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>WhatsApp</a>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {site.instagram && <a href={site.instagram} target="_blank" rel="noopener noreferrer" style={{ color: C.MID, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>Instagram</a>}
              {site.youtube && <a href={site.youtube} target="_blank" rel="noopener noreferrer" style={{ color: C.MID, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>YouTube</a>}
              {site.linkedin && <a href={site.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: C.MID, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none" }}>LinkedIn</a>}
            </div>
          </div>

          {/* RIGHT: photo + stats */}
          <div>
            {site.aboutPhoto && (
              <div style={{ aspectRatio: "3/4", overflow: "hidden", border: `1px solid ${C.BORDER}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", marginBottom: 24 }}>
                <img src={site.aboutPhoto} alt={site.aboutName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: C.BORDER }}>
              {[
                { label: "Years", value: site.statsYears },
                { label: "Projects", value: site.statsProjects },
                { label: "Clients", value: site.statsClients },
                { label: "Base", value: "UAE" },
              ].map((s) => (
                <div key={s.label} style={{ background: C.DARK, padding: "22px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.PL, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: C.MID, textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "64px 0 24px", marginTop: 48, borderTop: `1px solid ${C.BORDER}` }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>Let's Talk</div>
          <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, margin: "0 0 24px" }}>Have a Project In Mind?</h3>
          <a href="/contact" style={{ background: C.P, color: C.BG, padding: "13px 36px", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>Get In Touch</a>
        </div>
      </div>

      <SiteFooter site={site} />
    </main>
  );
}
