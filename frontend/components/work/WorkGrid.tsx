"use client";
// Category-filterable grid of EVERY real project -- same card design (B&W-by-default,
// full-color-on-hover reveal, gradient title/category/location overlay, image-count badge,
// "Featured" tag) as the homepage's own all-projects Work view (app/page.tsx, page==="work").
// That view is real and already shows every project, not just featured ones -- it just has
// no real URL of its own (client-side SPA state only). This is the same grid given a real,
// linkable, indexable page at /work so it's reachable from anywhere on the site, not only by
// clicking through the homepage first.
//
// Two tabs live on top of it: "Selected Work" and "All Projects". Both render through the
// exact same uniform grid below -- they used to differ (All Projects used a big/small bento
// layout), which read as an inconsistent gallery style, so both now share one render path
// and can't drift apart again.
import { useState } from "react";
import Link from "next/link";
import { CmsProject } from "@/lib/cmsData";
import { protectedImgProps, PROTECTED_IMG_CLASS } from "@/lib/imageProtection";

const C = {
  P: "var(--c-p,#703CF8)",
  PL: "var(--c-pl,#D7D4FF)",
  BG: "var(--c-bg,#170F28)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#221640)",
  BORDER: "var(--c-border,#3D2A5E)",
};

function ProjectCard({ p, span }: { p: CmsProject; span?: number }) {
  return (
    <Link
      key={p.id}
      href={`/work/${p.slug}/`}
      className={span ? `egallery-item eg-span-${span}` : undefined}
      style={{ display: "block", position: "relative", cursor: "pointer", overflow: "hidden", aspectRatio: span === 2 ? "16/9" : "4/3", background: C.DARK, textDecoration: "none" }}
      onMouseEnter={(e) => {
        (e.currentTarget.querySelector("img") as HTMLElement).style.transform = "scale(1.06)";
        (e.currentTarget.querySelector("img") as HTMLElement).style.filter = "grayscale(0)";
        (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.querySelector("img") as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget.querySelector("img") as HTMLElement).style.filter = "grayscale(1)";
        (e.currentTarget.querySelector(".ov") as HTMLElement).style.opacity = "0";
      }}
    >
      <img
        src={p.coverImage || p.images?.[0]?.url || ""}
        alt={p.projectName || p.title}
        loading="lazy"
        className={PROTECTED_IMG_CLASS}
        {...protectedImgProps}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "grayscale(1)", transition: "transform 0.6s, filter 0.6s" }}
      />
      {(p.images?.length || 0) > 0 && (
        <div style={{ position: "absolute", top: 14, left: 14, fontSize: 10, letterSpacing: 1, color: "rgba(255,255,255,0.9)", background: "rgba(9,6,14,0.6)", padding: "4px 9px", borderRadius: 20 }}>
          {p.images!.length} {p.images!.length === 1 ? "Photo" : "Photos"}
        </div>
      )}
      <div className="ov" style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(9,6,14,0.92) 0%,transparent 55%)", opacity: 0, transition: "opacity 0.3s", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: C.PL, textTransform: "uppercase", marginBottom: 6 }}>{p.categories?.join(" · ")}</div>
        <div style={{ fontSize: 18, letterSpacing: 2, color: "#fff" }}>{p.projectName || p.title}</div>
        {p.location && <div style={{ fontSize: 11, color: C.MID, marginTop: 4 }}>📍 {p.location}</div>}
      </div>
      {p.featured && (
        <div style={{ position: "absolute", top: 14, right: 14, background: C.P, color: "#fff", fontSize: 9, letterSpacing: 2, padding: "3px 8px", textTransform: "uppercase" }}>Featured</div>
      )}
    </Link>
  );
}

export default function WorkGrid({ projects }: { projects: CmsProject[] }) {
  const [filterCat, setFilterCat] = useState("All");
  const [view, setView] = useState<"selected" | "all">("selected");
  // "Selected Work" shows only projects marked Featured in the CMS; "All Projects" keeps
  // showing every project regardless of featured status (Naveed's request).
  const base = view === "selected" ? projects.filter((p) => p.featured) : projects;
  const cats = Array.from(new Set(base.flatMap((p) => p.categories || []))).sort();
  const filtered = filterCat === "All" ? base : base.filter((p) => p.categories?.includes(filterCat));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 32px 80px" }}>
      <div style={{ marginBottom: 28, display: "flex", gap: 28, borderBottom: `1px solid ${C.BORDER}`, paddingBottom: 18 }}>
        <span
          onClick={() => setView("selected")}
          style={{ fontSize: 12.6, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", color: view === "selected" ? C.PL : C.MID, borderBottom: view === "selected" ? `2px solid ${C.PL}` : "2px solid transparent", paddingBottom: 10, transition: "color 0.2s" }}
        >
          Selected Work
        </span>
        <span
          onClick={() => setView("all")}
          style={{ fontSize: 12.6, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", color: view === "all" ? C.PL : C.MID, borderBottom: view === "all" ? `2px solid ${C.PL}` : "2px solid transparent", paddingBottom: 10, transition: "color 0.2s" }}
        >
          All Projects
        </span>
      </div>

      <div style={{ marginBottom: 48, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <span
          onClick={() => setFilterCat("All")}
          style={{ fontSize: 11, letterSpacing: 1, padding: "8px 16px", borderRadius: 20, cursor: "pointer", border: `1px solid ${filterCat === "All" ? C.PL : C.BORDER}`, background: filterCat === "All" ? C.PL : "transparent", color: filterCat === "All" ? C.BG : C.MID, transition: "all 0.2s" }}
        >
          All ({base.length})
        </span>
        {cats.map((c) => {
          const cnt = base.filter((p) => p.categories?.includes(c)).length;
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

      {/* "All Projects" now renders with the exact same uniform grid as "Selected Work"
          (Naveed's request -- the two tabs previously showed identical content in two
          different layouts: this uniform grid vs a big/small bento pattern, which read as
          inconsistent). Both tabs share this one render path so they can never drift apart
          again; `view` is kept only to highlight which tab is active. */}
      {filtered.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: C.MID, fontSize: 14 }}>No projects in this category yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 3 }}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
