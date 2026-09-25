"use client";
import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from "framer-motion";

// Local, minimal shape -- Project isn't exported from app/page.tsx, so this mirrors just the
// fields this component actually reads. Every field already exists on the real Project type
// except `videoOrientation`, which was added there as an optional field (defaults to
// "landscape" everywhere it's read), so this component never needs its own duplicate data
// source or project system -- it's handed the same `projects` array the homepage already has.
export type ShowcaseProject = {
  id: string;
  title: string;
  slug: string;
  categories?: string[];
  coverImage?: string;
  youtubeUrl?: string;
  featured?: boolean;
  videoOrientation?: "landscape" | "portrait";
  description?: string;
};

// Brand palette, read from the same CSS custom properties the rest of the homepage uses (see
// the `C` object in app/page.tsx) so this component automatically stays in sync with any
// CMS-driven theme colors instead of hard-coding its own separate palette.
const CV = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  BG: "var(--c-bg,#09060E)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

// Minimal, Shorts-aware YouTube ID extractor. The existing helpers (getYTId / getYouTubeId in
// app/page.tsx) are file-local and not exported, so this is a small deliberate duplicate
// rather than a cross-file refactor of already-working code.
function ytId(url?: string): string {
  if (!url) return "";
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m?.[1] || "";
}

export default function CinematicShowcase({
  projects,
  isMobile,
}: {
  projects: ShowcaseProject[];
  isMobile: boolean;
}) {
  // Only projects the admin marked Featured AND gave a valid YouTube URL -- reuses the
  // existing "Featured on homepage" field rather than adding a new one, per spec.
  const items = useMemo(
    () => projects.filter((p) => p.featured && p.youtubeUrl && ytId(p.youtubeUrl)),
    [projects]
  );

  const [activeId, setActiveId] = useState<string>(items[0]?.id || "");
  // Poster-first: the iframe is mounted only after a click, and only for the active project --
  // never more than one iframe at a time, never autoplay-on-load, never preload-all.
  const [playing, setPlaying] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Scroll-driven entrance, scoped to this section's own progress (no global scroll listener).
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 85%", "start 30%"] });
  const frameScale = useTransform(scrollYProgress, [0, 1], reduceMotion ? [1, 1] : [0.86, 1]);
  const frameOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const infoOpacity = useTransform(scrollYProgress, [0.35, 1], [0, 1]);
  const infoY = useTransform(scrollYProgress, [0.35, 1], reduceMotion ? [0, 0] : [18, 0]);
  const railOpacity = useTransform(scrollYProgress, [0.55, 1], [0, 1]);

  if (items.length === 0) return null;

  const active = items.find((p) => p.id === activeId) || items[0];
  const orientation: "landscape" | "portrait" = active.videoOrientation || "landscape";
  const vid = ytId(active.youtubeUrl);

  const frameW = isMobile
    ? orientation === "portrait" ? 240 : 320
    : orientation === "portrait" ? 340 : 880;
  const frameAspect = orientation === "portrait" ? "9/16" : "16/9";

  function selectProject(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    setPlaying(false); // new project always starts on its poster, never auto-plays
  }

  return (
    <div ref={sectionRef} style={{ background: CV.BG, padding: isMobile ? "64px 0 72px" : "100px 0 110px", overflow: "hidden" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? "0 20px" : "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 52 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: CV.PL, textTransform: "uppercase", marginBottom: 14, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
            <span style={{ width: 24, height: 1, background: CV.PL, display: "inline-block" }} />
            In Motion
            <span style={{ width: 24, height: 1, background: CV.PL, display: "inline-block" }} />
          </div>
          <h2 style={{ fontSize: "clamp(28px,4vw,52px)", fontWeight: 700, letterSpacing: 1, margin: 0, color: CV.FG }}>
            Cinematic Showcase
          </h2>
        </div>

        {/* Device frame -- `layout` lets framer-motion animate the width/height/border-radius
            change between orientations as one continuous motion instead of an instant snap. */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <motion.div
            layout
            transition={reduceMotion ? { duration: 0.18 } : { type: "spring", stiffness: 120, damping: 22, mass: 0.9 }}
            style={{
              scale: frameScale,
              opacity: frameOpacity,
              width: frameW,
              maxWidth: "100%",
              aspectRatio: frameAspect,
              borderRadius: orientation === "portrait" ? 42 : 28,
              background: `linear-gradient(155deg, #1c1526 0%, ${CV.DARK} 55%, #0c0813 100%)`,
              padding: isMobile ? 8 : orientation === "portrait" ? 12 : 14,
              boxShadow: `0 40px 90px -20px rgba(0,0,0,0.65), 0 0 0 1px ${CV.BORDER}`,
              position: "relative",
            }}
          >
            {/* camera / dynamic-island detail -- deliberately generic, no logo */}
            <div
              style={{
                position: "absolute",
                top: orientation === "portrait" ? 6 : "50%",
                left: orientation === "portrait" ? "50%" : 6,
                transform: orientation === "portrait" ? "translateX(-50%)" : "translateY(-50%)",
                width: orientation === "portrait" ? 56 : 6,
                height: orientation === "portrait" ? 14 : 56,
                borderRadius: 20,
                background: "rgba(0,0,0,0.55)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
                zIndex: 3,
              }}
            />
            <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: orientation === "portrait" ? 32 : 18, overflow: "hidden", background: "#000" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id + (playing ? "-playing" : "-poster")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.35 }}
                  style={{ position: "absolute", inset: 0 }}
                >
                  {playing && vid ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title={active.title}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      style={{ width: "100%", height: "100%", border: "none" }}
                    />
                  ) : (
                    <button
                      onClick={() => setPlaying(true)}
                      aria-label={`Play ${active.title}`}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "pointer" }}
                    >
                      {active.coverImage ? (
                        <img
                          src={active.coverImage}
                          alt={active.title}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: CV.DARK }} />
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05) 45%)" }} />
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                          width: isMobile ? 52 : 68,
                          height: isMobile ? 52 : 68,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.14)",
                          backdropFilter: "blur(6px)",
                          border: "1px solid rgba(255,255,255,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 20 20" fill="#fff">
                          <path d="M5 3l13 7-13 7V3z" />
                        </svg>
                      </div>
                    </button>
                  )}
                  {/* restrained glass reflection */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)", pointerEvents: "none" }} />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Info: title / categories / description, appears progressively as the section scrolls in */}
        <motion.div style={{ opacity: infoOpacity, y: infoY, textAlign: "center", maxWidth: 640, margin: "32px auto 0" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: CV.PL, textTransform: "uppercase", marginBottom: 8 }}>
            {active.categories?.join(" · ")}
          </div>
          <h3 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 600, color: CV.FG, margin: "0 0 8px" }}>{active.title}</h3>
          {active.description && (
            <p style={{ fontSize: 13, lineHeight: 1.7, color: CV.MID, margin: 0 }}>{active.description}</p>
          )}
        </motion.div>

        {/* Horizontal project selector -- click-to-switch, no page reload */}
        {items.length > 1 && (
          <motion.div
            style={{ opacity: railOpacity, display: "flex", gap: 14, marginTop: isMobile ? 28 : 44, overflowX: "auto", padding: "4px 4px 12px", WebkitOverflowScrolling: "touch", justifyContent: isMobile ? "flex-start" : "center" }}
            role="listbox"
            aria-label="Select a project to view"
          >
            {items.map((p) => {
              const isActive = p.id === active.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectProject(p.id)}
                  role="option"
                  aria-selected={isActive}
                  aria-label={`View ${p.title} project`}
                  style={{
                    flex: "0 0 auto",
                    width: isMobile ? 120 : 150,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    opacity: isActive ? 1 : 0.55,
                    transition: "opacity 0.3s",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/10",
                      borderRadius: 6,
                      overflow: "hidden",
                      background: CV.DARK,
                      marginBottom: 8,
                      boxShadow: isActive ? `0 0 0 2px ${CV.P}` : `0 0 0 1px ${CV.BORDER}`,
                    }}
                  >
                    {p.coverImage && (
                      <img src={p.coverImage} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: CV.PL, textTransform: "uppercase", marginBottom: 2 }}>
                    {p.categories?.[0]}
                  </div>
                  <div style={{ fontSize: 12, color: CV.FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
