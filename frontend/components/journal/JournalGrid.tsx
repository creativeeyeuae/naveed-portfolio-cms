"use client";
// Category-filterable grid of every real blog post -- same card design (cover image,
// category . date eyebrow, title, excerpt, "Read More") as the homepage's own Journal view
// (app/page.tsx, page==="blog"). That view is real and already shows every post, not just
// recent ones -- it just has no real URL of its own (client-side SPA state only, and
// individual posts only exist at /journal/[slug]). This is the same grid given a real,
// linkable, indexable index page at /journal, same pattern as WorkGrid for /work.
import { useState } from "react";
import Link from "next/link";
import { CmsBlogPost } from "@/lib/cmsData";

const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

export default function JournalGrid({ posts }: { posts: CmsBlogPost[] }) {
  const cats = Array.from(new Set(posts.map((p) => p.category).filter((c): c is string => !!c))).sort();
  const [filterCat, setFilterCat] = useState("All");
  const filtered = filterCat === "All" ? posts : posts.filter((p) => p.category === filterCat);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 40px 80px" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 48 }}>
        <span
          onClick={() => setFilterCat("All")}
          style={{ fontSize: 11, letterSpacing: 1, padding: "8px 16px", borderRadius: 20, cursor: "pointer", border: `1px solid ${filterCat === "All" ? C.PL : C.BORDER}`, background: filterCat === "All" ? C.PL : "transparent", color: filterCat === "All" ? C.BG : C.MID, transition: "all 0.2s" }}
        >
          All ({posts.length})
        </span>
        {cats.map((c) => {
          const cnt = posts.filter((p) => p.category === c).length;
          if (!cnt) return null;
          return (
            <span
              key={c}
              onClick={() => setFilterCat(c)}
              style={{ fontSize: 11, letterSpacing: 1, padding: "8px 16px", borderRadius: 20, cursor: "pointer", border: `1px solid ${filterCat === c ? C.PL : C.BORDER}`, background: filterCat === c ? C.PL : "transparent", color: filterCat === c ? C.BG : C.MID, transition: "all 0.2s" }}
            >
              {c} ({cnt})
            </span>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: C.MID, fontSize: 14 }}>No posts in this category yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 24 }}>
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/journal/${b.slug}/`}
              style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer", background: C.DARK, border: `1px solid ${C.BORDER}`, borderRadius: 4, overflow: "hidden" }}
            >
              {b.coverImage && (
                <div style={{ aspectRatio: "16/9", overflow: "hidden" }}>
                  <img src={b.coverImage} alt={b.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: C.PL, textTransform: "uppercase", marginBottom: 8 }}>
                  {[b.category, b.date].filter(Boolean).join(" · ")}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 12px" }}>{b.title}</h3>
                <p style={{ color: C.MID, fontSize: 13, lineHeight: 1.7 }}>{b.excerpt}</p>
                <div style={{ marginTop: 16, fontSize: 11, letterSpacing: 2, color: C.PL, textTransform: "uppercase" }}>Read More →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
