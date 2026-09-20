import Link from "next/link";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";

// Real, indexable /cv page -- previously in-memory-only (reached via /?page=cv inside the
// homepage SPA, app/page.tsx's page==="cv" view). This is a straight port of that view's
// two-column sticky-skills + animated-timeline layout, sourced from the exact same CMS
// fields (settings.aboutPhoto/aboutName/aboutTitle/cvSections/skills, now exposed via
// getPublicSiteInfo()) -- nothing here is hardcoded. The one real difference: the SPA
// version switches to a single stacked column via a JS `isMobile` check; this static page
// uses a CSS media query instead (same breakpoint, no client-side state needed), matching
// the pattern every other standalone page here already uses (see About/Work/Packages).
const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  BORDER: "var(--c-border,#2D1F45)",
};

const CV_DESCRIPTION =
  "20+ years behind the camera across photography, cinematography and creative direction -- skills, tools and experience, at a glance.";

export async function generateMetadata() {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/cv/",
    title: `${site.cvBannerTitle} — ${site.siteName}`,
    description: CV_DESCRIPTION,
  });
}

export default async function CvPage() {
  const site = await getPublicSiteInfo();

  return (
    <InternalPageTemplate
      site={site}
      eyebrow={site.cvBannerEyebrow}
      title={site.cvBannerTitle}
      description={CV_DESCRIPTION}
      image={site.cvBannerImage}
    >
      <style>{`
        @keyframes cvItemIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cvGlow{0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,0.55)}50%{box-shadow:0 0 0 6px rgba(139,92,246,0.12)}}
        .cv-item{animation:cvItemIn 0.6s cubic-bezier(.16,.84,.44,1) both}
        .cv-dot{animation:cvGlow 2.6s ease-in-out infinite}
        .cv-skill-row{transition:color 0.2s,padding-left 0.2s}
        .cv-skill-row:hover{color:${C.PL};padding-left:6px}
        .cv-hero{display:grid;grid-template-columns:220px 1fr;gap:40px;align-items:center;margin-bottom:72px}
        .cv-body{display:grid;grid-template-columns:280px 1fr;gap:56px;align-items:start}
        .cv-skills-col{position:sticky;top:100px}
        .cv-timeline{position:relative;padding-left:28px;border-left:1px solid ${C.BORDER}}
        @media (max-width: 780px) {
          .cv-hero{grid-template-columns:1fr;text-align:center;justify-items:center}
          .cv-body{grid-template-columns:1fr;gap:48px}
          .cv-skills-col{position:static}
          .cv-timeline{padding-left:0;border-left:none}
          .cv-timeline .cv-dot{display:none}
        }
      `}</style>
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 40px 100px" }}>
        {/* PROFILE HERO */}
        <div className="cv-hero">
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ width: 180, height: 180, borderRadius: "50%", padding: 3, background: `linear-gradient(135deg,${C.P},#A855F7)`, flexShrink: 0 }}>
              {site.aboutPhoto ? (
                <img src={site.aboutPhoto} alt={site.aboutName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block", border: "4px solid var(--c-bg,#09060E)" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--c-dark,#140D21)", border: "4px solid var(--c-bg,#09060E)" }} />
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ width: 32, height: 1, background: C.PL, display: "inline-block" }} />Curriculum Vitae<span style={{ width: 32, height: 1, background: C.PL, display: "inline-block" }} />
            </div>
            <h1 style={{ fontSize: "clamp(32px,5vw,54px)", fontWeight: 700, letterSpacing: 1, margin: "0 0 10px", color: C.FG }}>{site.aboutName}</h1>
            <p style={{ color: C.PL, fontSize: 15, fontWeight: 600, letterSpacing: 1.5, marginBottom: 10 }}>{site.aboutTitle}</p>
            <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13 }}>{[site.phone, site.email].filter(Boolean).join(" · ")}</p>
            <div style={{ display: "flex", justifyContent: "flex-start", gap: 16, marginTop: 22 }}>
              <a href={`https://wa.me/${site.waNumber}?text=${encodeURIComponent(site.waMsg || "")}`} target="_blank" rel="noopener noreferrer" style={{ background: C.P, color: "#09060E", padding: "13px 32px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>WhatsApp</a>
              <Link href="/contact" style={{ background: "none", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.85)", padding: "13px 32px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>Book Now</Link>
            </div>
          </div>
        </div>

        <div className="cv-body">
          {site.skills.length > 0 && (
            <div className="cv-skills-col">
              <div style={{ fontSize: 12, letterSpacing: 5, color: C.PL, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ width: 20, height: 1, background: C.PL, display: "inline-block" }} />Skills &amp; Expertise
              </div>
              {site.skills.map((sk, i) => (
                <div key={i} className="cv-item" style={{ marginBottom: 16, padding: "20px 20px", background: "rgba(255,255,255,0.035)", border: `1px solid ${C.BORDER}`, borderRadius: 10, animationDelay: `${i * 0.08}s` }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 2, color: C.PL, textTransform: "uppercase", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.P, display: "inline-block", flexShrink: 0 }} />{sk.dept}
                  </h4>
                  {sk.items.map((item, j) => (
                    <div key={j} className="cv-skill-row" style={{ fontSize: 13.5, color: "rgba(255,255,255,0.62)", padding: "5px 0", borderBottom: j === sk.items.length - 1 ? "none" : `1px solid ${C.BORDER}` }}>→ {item}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, letterSpacing: 5, color: C.PL, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <span style={{ width: 20, height: 1, background: C.PL, display: "inline-block" }} />Experience &amp; Background
            </div>
            <div className="cv-timeline">
              {site.cvSections.map((sec, i) => {
                const dashIdx = sec.title.indexOf(" — ");
                const heading = dashIdx > -1 ? sec.title.slice(0, dashIdx) : sec.title;
                const meta = dashIdx > -1 ? sec.title.slice(dashIdx + 3) : "";
                return (
                  <div key={i} className="cv-item" style={{ position: "relative", marginBottom: 24, padding: "26px 28px", background: "rgba(255,255,255,0.035)", border: `1px solid ${C.BORDER}`, borderRadius: 10, animationDelay: `${i * 0.1}s` }}>
                    <span className="cv-dot" style={{ position: "absolute", left: -38, top: 30, width: 10, height: 10, borderRadius: "50%", background: C.P }} />
                    <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: 0.2, color: C.FG, margin: "0 0 6px", lineHeight: 1.35 }}>{heading}</h3>
                    {meta ? (
                      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, color: C.PL, textTransform: "uppercase", marginBottom: 16 }}>{meta}</div>
                    ) : (
                      <div style={{ width: 24, height: 2, background: C.P, marginBottom: 16, borderRadius: 1 }} />
                    )}
                    <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 14.5, lineHeight: 1.85, margin: 0 }}>{sec.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 64, paddingTop: 40, borderTop: `1px solid ${C.BORDER}`, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/contact" style={{ background: C.P, color: "#09060E", padding: "13px 36px", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>Book a Session</Link>
          <a href={`https://wa.me/${site.waNumber}?text=${encodeURIComponent(site.waMsg || "")}`} target="_blank" rel="noopener noreferrer" style={{ background: "none", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.85)", padding: "13px 36px", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>WhatsApp</a>
        </div>
      </div>
    </InternalPageTemplate>
  );
}
