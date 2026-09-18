"use client";
// Was a real, site-native Likes + moderated Comments widget (backed by functions/api/likes.ts
// and functions/api/comments.ts). Per direction: no on-site likes/comments engagement is
// needed any more -- both actions now just point people at the actual Google Business review
// page instead, so a "like" or a "comment" here becomes a real review Naveed can act on,
// rather than an anonymous entry only visible on this one page. The API routes and their
// database tables are left untouched (not deleted) in case they're wanted again later; this
// component simply no longer calls them.
//
// GOOGLE_REVIEW_URL is the one place this link lives -- update it here if the Google Business
// listing ever changes.
const GOOGLE_REVIEW_URL = "https://g.page/r/CWxX8_bAkJKTEAE/review";

export default function ProjectEngagement({ compact }: { projectId: string; compact?: boolean; anchorId?: string }) {
  const size = compact
    ? { fontSize: 13, padding: "0", gap: 7 }
    : { fontSize: 14, padding: "8px 18px", gap: 8 };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <a
        href={GOOGLE_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: size.gap,
          color: "var(--text-muted, #A892C6)",
          fontSize: size.fontSize,
          textDecoration: "none",
          ...(compact ? {} : { border: "1px solid var(--border-subtle, #2D1F45)", borderRadius: 20, padding: size.padding }),
        }}
      >
        <span>♡</span>
        <span>Like on Google</span>
      </a>
      {compact && <span style={{ color: "var(--border-subtle, #2D1F45)" }}>·</span>}
      <a
        href={GOOGLE_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: size.gap,
          color: "var(--text-muted, #A892C6)",
          fontSize: size.fontSize,
          textDecoration: "none",
          ...(compact ? {} : { border: "1px solid var(--border-subtle, #2D1F45)", borderRadius: 20, padding: size.padding }),
        }}
      >
        <span>💬</span>
        <span>Leave a Review</span>
      </a>
    </div>
  );
}
