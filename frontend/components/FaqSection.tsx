// Shared FAQ block -- renders the visible Q&A list AND embeds the matching FAQPage
// schema.org JSON-LD (Google rich-result eligibility) in one place, so every page that
// shows FAQs (every SEO service page via ServicePage.tsx, plus the /photography and
// /cinematography hub pages) gets the same real, indexable rich-snippet markup rather than
// each page having to remember to add its own <script> tag. Renders nothing at all when
// there are no FAQs yet (a hub page an admin hasn't added FAQs to in CMS > Service Pages
// yet) -- no empty heading, no empty schema.
import { jsonLdScriptProps } from "@/lib/seo";

const FG = "#FFFFFF", DARK = "#140D21", BORDER = "#2D1F45";

export default function FaqSection({ faqs, background = DARK }: { faqs: { q: string; a: string }[]; background?: string }) {
  if (!faqs || faqs.length === 0) return null;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section style={{ padding: "0 24px 72px", background }}>
      <script {...jsonLdScriptProps(faqSchema)} />
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 0 0" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 28, color: FG }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: FG, marginBottom: 8 }}>{f.q}</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.68)" }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
