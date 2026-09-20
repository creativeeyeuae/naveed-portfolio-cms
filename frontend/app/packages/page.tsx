import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";

// Real, indexable static route (/packages) -- previously only reachable via the homepage
// SPA's in-memory Packages view (no real URL, and static routes fell back to a "/?page="
// query-param workaround that showed "page=packages" in the address bar). Same shared
// InternalPageTemplate (nav + banner + footer) as /work, /about, /gear and /contact, so this
// page behaves and looks like a proper standalone internal page, not a special design. Real
// CMS content only: pricing tiers from settings.pricingPackages and services from
// settings.services (both via getPublicSiteInfo()) -- no hardcoded duplicate pricing/service
// content. Nothing in the homepage SPA's own in-memory Packages view changed.
const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  BG: "var(--c-bg,#09060E)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteInfo();
  return buildMetadata({
    path: "/packages/",
    title: `${site.packagesBannerTitle} — ${site.siteName}`,
    description: `Photography and videography packages, pricing and services from ${site.siteName}.`,
    ogType: "website",
  });
}

export default async function PackagesPage() {
  const site = await getPublicSiteInfo();

  return (
    <InternalPageTemplate site={site} eyebrow={site.packagesBannerEyebrow} title={site.packagesBannerTitle} image={site.packagesBannerImage}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px 40px" }}>
        {/* PRICING TIERS -- real CMS data (Settings > Packages), no invented pricing.
            Hover/keyboard-focus flips each card to a solid-accent back face listing what's
            included (.pflip in globals.css -- the same generic 3D-CSS flip technique the
            homepage SPA's own in-memory Packages view already used, modeled on the shamsfz.ae
            reference). Explicit height is required on .pflip: the faces are position:absolute
            so the wrapper has no intrinsic height of its own. The CTA button uses the package's
            optional Button Link (CMS > Packages > Button Link) when set -- an absolute URL opens
            in a new tab, anything else is treated as an internal page path -- and falls back to
            /contact exactly as before when left blank. */}
        {site.pricingPackages.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24, marginBottom: 64 }}>
            {site.pricingPackages.map((p) => {
              const ctaHref = p.ctaLink && p.ctaLink.trim() ? p.ctaLink.trim() : "/contact";
              const ctaLabel = p.ctaLabel || "Book Now";
              const ctaIsExternal = /^https?:\/\//i.test(ctaHref);
              const ctaStyle = {
                marginTop: 10,
                background: C.P,
                color: C.BG,
                textAlign: "center" as const,
                padding: "11px 20px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                textDecoration: "none",
                borderRadius: 2,
              };
              const backCtaStyle = {
                marginTop: 16,
                textAlign: "center" as const,
                background: "#fff",
                color: C.P,
                padding: "11px 20px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                textDecoration: "none",
                borderRadius: 2,
              };
              return (
                <div key={p.id} className="pflip" style={{ height: 420 }}>
                  <div className="pflip-inner">
                    <div
                      className="pflip-face"
                      style={{
                        border: `1px solid ${C.BORDER}`,
                        background: p.image ? `linear-gradient(180deg,rgba(20,13,33,0.55) 0%,rgba(20,13,33,0.92) 100%), url(${p.image}) center/cover` : C.DARK,
                        padding: "32px 28px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {p.icon && <div style={{ fontSize: 26 }}>{p.icon}</div>}
                      <div style={{ fontSize: 11, letterSpacing: 3, color: C.PL, textTransform: "uppercase" }}>{p.label}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: C.FG }}>{p.price}</span>
                        {p.priceNote && <span style={{ fontSize: 12, color: C.MID }}>{p.priceNote}</span>}
                      </div>
                      {p.desc && <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.72)", margin: 0, flex: 1 }}>{p.desc}</p>}
                      {p.features && p.features.length > 0 && (
                        <div style={{ fontSize: 10, letterSpacing: 1, color: C.PL }}>↻ Hover to see what&apos;s included</div>
                      )}
                      {ctaIsExternal ? (
                        <a href={ctaHref} target="_blank" rel="noopener noreferrer" style={ctaStyle}>{ctaLabel}</a>
                      ) : (
                        <Link href={ctaHref} style={ctaStyle}>{ctaLabel}</Link>
                      )}
                    </div>
                    <div className="pflip-face pflip-back" style={{ background: C.P, borderRadius: 2, padding: "32px 28px", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                        {p.icon && <span style={{ fontSize: 20 }}>{p.icon}</span>}
                        <span style={{ fontSize: 11, letterSpacing: 3, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>{p.label}</span>
                      </div>
                      <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>Includes</div>
                      <div style={{ flex: 1, overflowY: "auto" }}>
                        {(p.features || []).map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,0.94)", lineHeight: 1.5 }}>
                            <span style={{ flexShrink: 0 }}>✓</span>{f}
                          </div>
                        ))}
                      </div>
                      {ctaIsExternal ? (
                        <a href={ctaHref} target="_blank" rel="noopener noreferrer" style={backCtaStyle}>{ctaLabel}</a>
                      ) : (
                        <Link href={ctaHref} style={backCtaStyle}>{ctaLabel}</Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SERVICES -- real CMS data (Settings > Services) */}
        {site.packagesServices.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>Services</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24 }}>
              {site.packagesServices.map((sv) => (
                <div key={sv.id} style={{ border: `1px solid ${C.BORDER}`, padding: "26px 22px" }}>
                  {sv.icon && <div style={{ fontSize: 22, marginBottom: 10 }}>{sv.icon}</div>}
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.FG, marginBottom: 8 }}>{sv.title}</div>
                  {sv.desc && <p style={{ fontSize: 13, lineHeight: 1.7, color: C.MID, margin: sv.deliverables?.length ? "0 0 12px" : 0 }}>{sv.desc}</p>}
                  {sv.deliverables && sv.deliverables.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                      {sv.deliverables.map((d, i) => (
                        <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", display: "flex", gap: 8 }}>
                          <span style={{ color: C.PL }}>—</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA -- same pattern as /about and /gear */}
        <div style={{ textAlign: "center", padding: "64px 0 24px", marginTop: 48, borderTop: `1px solid ${C.BORDER}` }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>Let&apos;s Talk</div>
          <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, margin: "0 0 24px" }}>Have a Project In Mind?</h3>
          <Link href="/contact" style={{ background: C.P, color: C.BG, padding: "13px 36px", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", textDecoration: "none", borderRadius: 2 }}>
            Get In Touch
          </Link>
        </div>
      </div>
    </InternalPageTemplate>
  );
}
