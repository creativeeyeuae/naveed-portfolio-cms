// Shared presentational shell for every standalone SEO service page (app/<slug>/page.tsx).
// A plain server component -- no "use client", no hooks -- since these pages need to be
// fast, crawlable, static HTML with zero client JS required to read the content. Each
// app/<slug>/page.tsx supplies its own <ServicePage data={...}/> plus its own `metadata`
// export (Next.js requires that at the page level, so it can't live in here).
//
// Deliberately does NOT reuse the homepage's client-side Nav/Footer (those are closures
// defined inside the "/" page's Home() component and read its local state -- pulling them
// out would mean editing that large, working file just for this). Instead this renders its
// own small, real <a href> header/footer using the same real contact details already public
// on the site (see app/layout.tsx's structured data), so search engines and visitors get a
// simple, honest way back into the main site and to get in touch -- no invented content.
import Link from "next/link";
import { SERVICE_PAGES } from "@/lib/servicePagesData";
import { serviceJsonLd, breadcrumbJsonLd, imageObjectJsonLd, jsonLdScriptProps } from "@/lib/seo";

const P = "#8B5CF6", PL = "#E2D9F3", DARK = "#140D21", BG = "#09060E", FG = "#FFFFFF", MID = "#A892C6", BORDER = "#2D1F45";
const WA_NUMBER = "971581174911";
const EMAIL = "creativeeyeuae@gmail.com";
const PHONE_DISPLAY = "+971 58 117 4911";

function waHref(service: string) {
  const msg = `Hi Naveed, I found your site and I'm interested in ${service} for a project in Dubai. Could you share more details?`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export type ServicePageData = {
  slug: string;
  h1: string;
  eyebrow: string;
  intro: string;
  serviceLabel: string; // short name used in the WhatsApp CTA message, e.g. "real estate photography"
  sections: { heading: string; body: string }[];
  heroImage?: { src: string; alt: string };
  faqs: { q: string; a: string }[];
  // Optional: a dated list of real upcoming Dubai exhibitions/trade shows (used on the
  // exhibition-photographer/videographer pages). Keep this list current -- these dates go
  // stale -- and never invent a date; only add events with a confirmed source.
  upcomingEvents?: { name: string; dates: string; venue: string }[];
};

export default function ServicePage({ data }: { data: ServicePageData }) {
  const related = SERVICE_PAGES.filter((s) => s.slug !== data.slug);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  // Service + BreadcrumbList (+ ImageObject when a hero photo is set) -- added once here so
  // every page using ServicePage picks them up automatically, no per-page edits needed.
  // LocalBusiness/ProfessionalService is NOT repeated (already site-wide in app/layout.tsx).
  const serviceSchema = serviceJsonLd({ path: `/${data.slug}/`, name: data.h1, description: data.intro });
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: data.h1, path: `/${data.slug}/` },
  ]);
  const imageSchema = data.heroImage ? imageObjectJsonLd({ url: data.heroImage.src, alt: data.heroImage.alt }) : null;

  return (
    <div style={{ background: BG, color: FG, minHeight: "100vh", fontFamily: "inherit" }}>
      <script {...jsonLdScriptProps(faqSchema)} />
      <script {...jsonLdScriptProps(serviceSchema)} />
      <script {...jsonLdScriptProps(breadcrumbSchema)} />
      {imageSchema && <script {...jsonLdScriptProps(imageSchema)} />}

      {/* Minimal header: logo back to the real homepage + a direct WhatsApp enquiry button. */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px", borderBottom: `1px solid ${BORDER}`, flexWrap: "wrap", gap: 14 }}>
        <Link href="/" style={{ fontSize: 14, letterSpacing: 4, textTransform: "uppercase", color: FG, textDecoration: "none", fontWeight: 600 }}>
          Naveed Anjum
        </Link>
        <a href={waHref(data.serviceLabel)} target="_blank" rel="noopener noreferrer" style={{ background: P, color: "#fff", padding: "10px 22px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", borderRadius: 3, fontWeight: 700 }}>
          Enquire on WhatsApp
        </a>
      </header>

      {/* Hero band -- solid brand-color gradient (same "no photo yet -> solid band" fallback
          pattern already used site-wide, e.g. PageBanner on the main site) rather than any
          stock or unrelated image standing in for real project work. */}
      <section style={{ position: "relative", overflow: "hidden", background: `linear-gradient(140deg, ${DARK} 0%, ${BG} 100%)`, padding: "72px 24px 56px" }}>
        <div aria-hidden style={{ position: "absolute", top: -80, right: "-8%", width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)`, filter: "blur(60px)" }} />
        <div style={{ maxWidth: 880, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span style={{ width: 28, height: 1, background: PL }} />
            <span style={{ fontSize: 11, letterSpacing: 5, textTransform: "uppercase", color: PL }}>{data.eyebrow}</span>
          </div>
          <h1 style={{ fontSize: "clamp(30px,5vw,50px)", fontWeight: 700, lineHeight: 1.15, margin: "0 0 22px" }}>{data.h1}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,0.78)", maxWidth: 680, margin: "0 0 30px" }}>{data.intro}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href={waHref(data.serviceLabel)} target="_blank" rel="noopener noreferrer" style={{ background: P, color: "#fff", padding: "14px 32px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", borderRadius: 3, fontWeight: 700 }}>
              Book a Consultation
            </a>
            <Link href="/" style={{ background: "none", border: `1px solid rgba(255,255,255,0.25)`, color: "rgba(255,255,255,0.8)", padding: "14px 32px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", borderRadius: 3, fontWeight: 700 }}>
              View Full Portfolio
            </Link>
          </div>
        </div>
      </section>

      {data.heroImage && (
        <section style={{ padding: "0 24px", margin: "-1px 0 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <img src={data.heroImage.src} alt={data.heroImage.alt} style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 6, border: `1px solid ${BORDER}` }} />
          </div>
        </section>
      )}

      {/* Upcoming exhibitions -- real, sourced dates only (see ServicePageData comment). */}
      {data.upcomingEvents && data.upcomingEvents.length > 0 && (
        <section style={{ padding: "0 24px", margin: "40px 0 0" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: MID, letterSpacing: 1, textTransform: "uppercase" }}>Upcoming Exhibitions in Dubai</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 20px" }}>
              A few of the major trade shows on Dubai's calendar -- useful if you're planning stand coverage around one of these. Always confirm exact dates with the organiser closer to the show.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.upcomingEvents.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "14px 18px" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: FG }}>{e.name}</span>
                  <span style={{ fontSize: 13, color: PL, whiteSpace: "nowrap" }}>{e.dates}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{e.venue}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service detail sections */}
      <section style={{ padding: "72px 24px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 48 }}>
          {data.sections.map((s, i) => (
            <div key={i}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 14px", color: FG }}>{s.heading}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.72)", margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs -- also embedded above as FAQPage schema for rich-result eligibility. */}
      <section style={{ padding: "0 24px 72px", background: DARK }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 0 0" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28 }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {data.faqs.map((f, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: FG, marginBottom: 8 }}>{f.q}</div>
                <div style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.68)" }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related services -- real internal <a>/<Link> anchors so both crawlers and visitors
          can move between every service page and back to the main portfolio. */}
      <section style={{ padding: "56px 24px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: MID, letterSpacing: 1, textTransform: "uppercase" }}>Related Services in Dubai</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/${r.slug}`} style={{ fontSize: 13, color: PL, textDecoration: "none", border: `1px solid ${BORDER}`, borderRadius: 30, padding: "9px 18px" }}>
                {r.label} Dubai →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "64px 24px", textAlign: "center", background: `linear-gradient(140deg, ${DARK} 0%, ${BG} 100%)` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14 }}>Let&rsquo;s talk about your project</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 28 }}>
            Based in Dubai and available across the UAE. Get in touch for availability, rates and turnaround times.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={waHref(data.serviceLabel)} target="_blank" rel="noopener noreferrer" style={{ background: P, color: "#fff", padding: "14px 32px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", borderRadius: 3, fontWeight: 700 }}>
              WhatsApp Naveed
            </a>
            <a href={`mailto:${EMAIL}`} style={{ background: "none", border: `1px solid rgba(255,255,255,0.25)`, color: "rgba(255,255,255,0.8)", padding: "14px 32px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", textDecoration: "none", borderRadius: 3, fontWeight: 700 }}>
              Email {EMAIL}
            </a>
          </div>
        </div>
      </section>

      <footer style={{ padding: "32px 24px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, fontSize: 12, color: MID }}>
        <div>
          © {new Date().getFullYear()} Naveed Anjum — Creative Fusion · Dubai, UAE · {PHONE_DISPLAY}
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <a href="https://www.instagram.com/bynaveedanjum/" target="_blank" rel="noopener noreferrer" style={{ color: MID, textDecoration: "none" }}>Instagram</a>
          <a href="https://youtube.com/@creativeeyeuae" target="_blank" rel="noopener noreferrer" style={{ color: MID, textDecoration: "none" }}>YouTube</a>
          <a href="https://linkedin.com/in/naveedanjumch" target="_blank" rel="noopener noreferrer" style={{ color: MID, textDecoration: "none" }}>LinkedIn</a>
          <Link href="/" style={{ color: MID, textDecoration: "none" }}>Home</Link>
        </div>
      </footer>
    </div>
  );
}
