import type { Metadata } from "next";

// Custom 404 -- required for a search-friendly site (a missing page should return a
// real "not found" experience, not a broken/blank screen) and specifically requested
// as part of the search/AI-discoverability pass. Kept static and framework-only, no
// CMS data, since this must render even when nothing else on the page can resolve.
// noindex is intentional and correct here: a 404 page should never itself be indexed.
export const metadata: Metadata = {
  title: "Page Not Found — Creative Fusion | Naveed Anjum",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "var(--accent-primary)",
          marginBottom: "16px",
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: "var(--font-serif), 'Plus Jakarta Sans', sans-serif",
          fontSize: "clamp(28px, 5vw, 44px)",
          fontWeight: 700,
          margin: "0 0 12px",
        }}
      >
        This page doesn&apos;t exist
      </h1>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "15px",
          maxWidth: "440px",
          lineHeight: 1.7,
          margin: "0 0 32px",
        }}
      >
        The page you&apos;re looking for may have been moved or never existed.
        Head back to explore the portfolio, services, and journal.
      </p>
      <a
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          borderRadius: "2px",
          border: "1px solid var(--border-accent)",
          color: "var(--text-primary)",
          textDecoration: "none",
          fontSize: "14px",
          letterSpacing: "0.5px",
          background: "var(--accent-subtle)",
        }}
      >
        Return Home
      </a>
    </div>
  );
}
