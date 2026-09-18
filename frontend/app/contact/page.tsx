import type { Metadata } from "next";
import { getPublicSiteInfo } from "@/lib/cmsData";
import { buildMetadata } from "@/lib/seo";
import InternalPageTemplate from "@/components/InternalPageTemplate";
import ContactForm from "./ContactForm";

// Real, indexable static route (/contact) -- previously a broken legacy stub: a form using
// react-hook-form + a dead Cloudflare Worker API (@/lib/api's api.bookings.create) that does
// not exist in production, so every submission silently failed; no SiteHeader/SiteFooter, no
// CMS data. Rewritten to reuse the exact real, WORKING contact pipeline the homepage SPA's
// own Contact page-view already uses (app/page.tsx's submitContact(): WhatsApp deep link +
// a real Supabase write, ported here as lib/cmsData.ts's submitContactLead()), plus the same
// shared SiteHeader/SiteFooter + PageBanner-style visual language as /work/[slug] and /about.
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
    path: "/contact/",
    title: `Contact — ${site.siteName}`,
    description: `Get in touch with ${site.siteName} to discuss your next project.`,
    ogType: "website",
  });
}

export default async function ContactPage() {
  const site = await getPublicSiteInfo();

  const cards = [
    { label: "WhatsApp", value: site.phone, href: `https://wa.me/${site.waNumber}?text=${encodeURIComponent(site.waMsg || "")}`, external: true },
    { label: "Email", value: site.email, href: site.email ? `mailto:${site.email}` : undefined, external: false },
    { label: "Location", value: site.location, href: undefined, external: false },
  ].filter((c) => c.value);

  return (
    <InternalPageTemplate site={site} eyebrow={site.contactBannerEyebrow} title={site.contactBannerTitle} image={site.contactBannerImage}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 24px 40px" }}>
        {/* CONTACT METHOD CARDS -- real CMS data only, empty fields hidden entirely */}
        {cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 56 }}>
            {cards.map((c) => {
              const inner = (
                <div style={{ border: `1px solid ${C.BORDER}`, background: C.DARK, padding: "26px 22px", height: "100%" }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, color: C.PL, textTransform: "uppercase", marginBottom: 10 }}>{c.label}</div>
                  <div style={{ fontSize: 15, color: C.FG }}>{c.value}</div>
                </div>
              );
              return c.href ? (
                <a key={c.label} href={c.href} target={c.external ? "_blank" : undefined} rel={c.external ? "noopener noreferrer" : undefined} style={{ textDecoration: "none", display: "block" }}>{inner}</a>
              ) : (
                <div key={c.label}>{inner}</div>
              );
            })}
          </div>
        )}

        <ContactForm site={site} />
      </div>
    </InternalPageTemplate>
  );
}
