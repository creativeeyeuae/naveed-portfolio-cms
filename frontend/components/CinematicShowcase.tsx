"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from "framer-motion";

// The WebGL device-frame body (three.js + @react-three/fiber) is genuinely heavier than the
// rest of this component, so it lives in its own code-split chunk -- never part of the initial
// page bundle -- and is only ever loaded client-side, since a <canvas>/WebGL context needs the
// browser. See the `show3D` IntersectionObserver gate below for when it actually starts loading.
const DeviceFrame3D = dynamic(() => import("./DeviceFrame3D"), { ssr: false });

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

// --- YouTube IFrame Player API loader -----------------------------------------------------
// Module-level singleton: the API script and its ready-callback are only ever registered
// once, no matter how many times this component mounts/unmounts across the page.
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === "function") prevReady();
      resolve(w.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ctrlBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 4,
  margin: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  opacity: 0.9,
};

// --- Minimal inline control-bar icons (no external icon library) -------------------------
function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" fill="#fff" />
    </svg>
  );
}
function PauseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="6" y="5" width="4" height="14" fill="#fff" />
      <rect x="14" y="5" width="4" height="14" fill="#fff" />
    </svg>
  );
}
function PrevIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M6 5h2v14H6z" fill="#fff" />
      <path d="M18 5v14l-10-7z" fill="#fff" />
    </svg>
  );
}
function NextIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M16 5h2v14h-2z" fill="#fff" />
      <path d="M6 5v14l10-7z" fill="#fff" />
    </svg>
  );
}
function VolumeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h4l5 5V4L8 9H4z" fill="#fff" />
      <path d="M16.2 8.8a5 5 0 010 6.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function MuteIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h4l5 5V4L8 9H4z" fill="#fff" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function FullscreenIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  // Poster-first: the player is mounted only after a click, and only for the active project --
  // never more than one player at a time, never autoplay-on-load, never preload-all.
  const [playing, setPlaying] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Scroll-driven entrance, scoped to this section's own progress (no global scroll listener).
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 85%", "start 30%"] });
  const frameScale = useTransform(scrollYProgress, [0, 1], reduceMotion ? [1, 1] : [0.86, 1]);
  const frameOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  // Subtle perspective/depth cue as the device enters -- a slight tilt that settles flat by
  // the time it reaches full size, so the entrance itself reads as 3D, not just scale+fade.
  const frameRotateX = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [8, 0]);
  const infoOpacity = useTransform(scrollYProgress, [0.35, 1], [0, 1]);
  const infoY = useTransform(scrollYProgress, [0.35, 1], reduceMotion ? [0, 0] : [18, 0]);
  const railOpacity = useTransform(scrollYProgress, [0.55, 1], [0, 1]);

  // Read into a ref instead of state -- the 3D frame's WebGL scene reads this every animation
  // frame via its own render loop, and re-rendering this whole component on every scroll pixel
  // would be wasteful; nothing here needs a React re-render when it changes.
  const scrollProgressRef = useRef(1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollProgressRef.current = v;
  });

  // The WebGL frame is real but non-essential weight -- only start loading/mounting it once
  // this section is getting close to the viewport, so a visitor who never scrolls this far
  // never pays for it. Falls back to the existing flat metal-gradient background (unchanged)
  // until then, and forever if IntersectionObserver isn't available.
  const [show3D, setShow3D] = useState(false);

  // Computed defensively (optional chaining) because these feed hooks below that must run
  // unconditionally, before we know yet whether `items` is even non-empty.
  const active = items.find((p) => p.id === activeId) || items[0];
  const orientation: "landscape" | "portrait" = active?.videoOrientation || "landscape";
  const vid = ytId(active?.youtubeUrl);
  const iframeElId = `cinematic-yt-${(active?.id || "none").replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // --- Custom video-control state, driven by the YouTube IFrame Player API ------------------
  // This replaces YouTube's own on-video UI (the embed is loaded with controls=0 below) with
  // a bespoke play/pause/prev/next/volume/progress/time/fullscreen bar.
  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    muted: false,
    volume: 100,
  });

  useEffect(() => {
    if (!playing || !vid) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !YT) return;
      const el = document.getElementById(iframeElId);
      if (!el) return;
      playerRef.current = new YT.Player(iframeElId, {
        events: {
          onReady: (e: any) => {
            try {
              e.target.playVideo();
              setPlayerState((s) => ({
                ...s,
                duration: e.target.getDuration?.() || 0,
                volume: e.target.getVolume?.() ?? 100,
                muted: !!e.target.isMuted?.(),
              }));
            } catch {}
          },
          onStateChange: (e: any) => {
            const YTState = (window as any).YT?.PlayerState;
            setPlayerState((s) => ({
              ...s,
              isPlaying: YTState ? e.data === YTState.PLAYING : s.isPlaying,
            }));
          },
        },
      });
    });
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === "function") {
        setPlayerState((s) => ({
          ...s,
          currentTime: p.getCurrentTime() || 0,
          duration: p.getDuration ? p.getDuration() || s.duration : s.duration,
        }));
      }
    }, 400);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch {}
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, vid, iframeElId]);

  // Start loading the 3D frame chunk once this section is within ~800px of the viewport.
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    if (!sectionRef.current || show3D) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShow3D(true);
          obs.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [show3D]);

  // Mouse-reactive "glass" highlight on the screen glass -- a soft specular spot that follows
  // the pointer across the whole section, imperatively (direct style write, no re-render) so it
  // stays smooth. Gated behind `show3D` so it starts at the same moment as the 3D frame, and a
  // visitor who never scrolls here never pays for the rAF loop either.
  useEffect(() => {
    if (!show3D) return;
    const sheen = sheenRef.current;
    const frame = sectionRef.current;
    if (!sheen || !frame || typeof window === "undefined") return;
    let raf = 0;
    let targetX = 50, targetY = 30, curX = 50, curY = 30;
    function onMove(e: MouseEvent) {
      const rect = frame!.getBoundingClientRect();
      targetX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
      targetY = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    }
    function tick() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      if (sheen) {
        sheen.style.background = `radial-gradient(circle at ${curX}% ${curY}%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 22%, rgba(255,255,255,0) 45%)`;
      }
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [show3D]);

  if (items.length === 0) return null;

  const frameW = isMobile
    ? orientation === "portrait" ? 240 : 320
    : orientation === "portrait" ? 340 : 880;
  const frameAspect = orientation === "portrait" ? "9/16" : "16/9";
  const originParam = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
  // Corner radius expressed as a fraction of the frame's shorter side -- lets the 3D frame's
  // rounded-box geometry match this exact CSS borderRadius (below) at any breakpoint/orientation
  // without hand-tuning per case.
  const frameBorderRadiusPx = orientation === "portrait" ? 44 : 30;
  const frameH = orientation === "portrait" ? frameW * (16 / 9) : frameW * (9 / 16);
  const radiusFraction = frameBorderRadiusPx / Math.min(frameW, frameH);

  function selectProject(id: string) {
    if (id === activeId) return;
    setActiveId(id);
    setPlaying(false); // new project always starts on its poster, never auto-plays
    setPlayerState({ isPlaying: false, currentTime: 0, duration: 0, muted: false, volume: 100 });
  }

  function togglePlay() {
    if (!playing) {
      setPlaying(true);
      return;
    }
    const p = playerRef.current;
    if (!p) return;
    if (playerState.isPlaying) p.pauseVideo?.();
    else p.playVideo?.();
  }

  function goPrev() {
    const idx = items.findIndex((p) => p.id === active.id);
    if (idx < 0) return;
    selectProject(items[(idx - 1 + items.length) % items.length].id);
  }

  function goNext() {
    const idx = items.findIndex((p) => p.id === active.id);
    if (idx < 0) return;
    selectProject(items[(idx + 1) % items.length].id);
  }

  function toggleMute() {
    const p = playerRef.current;
    const nextMuted = !playerState.muted;
    if (p) {
      if (nextMuted) p.mute?.();
      else p.unMute?.();
    }
    setPlayerState((s) => ({ ...s, muted: nextMuted }));
  }

  function onVolumeChange(v: number) {
    const p = playerRef.current;
    if (p) {
      p.setVolume?.(v);
      if (v === 0) p.mute?.();
      else p.unMute?.();
    }
    setPlayerState((s) => ({ ...s, volume: v, muted: v === 0 }));
  }

  function onSeek(t: number) {
    const p = playerRef.current;
    if (p && typeof p.seekTo === "function") p.seekTo(t, true);
    setPlayerState((s) => ({ ...s, currentTime: t }));
  }

  function toggleFullscreen() {
    const el = screenRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  }

  // Camera/dynamic-island detail + the video/poster screen -- identical regardless of how the
  // outer frame itself animates (desktop morph vs. mobile 3D flip, below), so it's built once.
  const frameChrome = (
    <>
      {/* Metallic body sheen -- a brushed/anodized-metal light sweep with a second, fainter
          highlight near the far edge (how a curved metal edge actually catches light twice),
          instead of one flat diagonal wash. Purely a hardware-realism cue, not any brand's
          specific design. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background:
            "linear-gradient(112deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 9%, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 76%, rgba(255,255,255,0.05) 88%, rgba(255,255,255,0.18) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Faint vertical brushed-metal grain, layered under the sheen -- breaks up what would
          otherwise be a perfectly flat painted surface. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background:
            "repeating-linear-gradient(100deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px)",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Physical side buttons (volume rocker + power key) -- generic smartphone hardware,
          not tied to any single brand's design -- rotate position with the device itself so
          a "landscape" phone reads as the same object physically turned on its side. */}
      <div
        style={{
          position: "absolute",
          ...(orientation === "portrait"
            ? { top: "16%", left: -3, width: 3, height: 30 }
            : { top: -3, left: "20%", width: 30, height: 3 }),
          borderRadius: 2,
          background: "linear-gradient(90deg, rgba(255,255,255,0.16), rgba(0,0,0,0.55))",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...(orientation === "portrait"
            ? { top: "28%", left: -3, width: 3, height: 22 }
            : { top: -3, left: "34%", width: 22, height: 3 }),
          borderRadius: 2,
          background: "linear-gradient(90deg, rgba(255,255,255,0.16), rgba(0,0,0,0.55))",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...(orientation === "portrait"
            ? { top: "18%", right: -3, width: 3, height: 36 }
            : { bottom: -3, left: "56%", width: 36, height: 3 }),
          borderRadius: 2,
          background: "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(0,0,0,0.5))",
          zIndex: 2,
        }}
      />
      {/* Flat CSS camera dot -- kept only as the pre-3D/no-WebGL fallback. Once the real 3D
          frame (with its own genuinely-modeled camera-lens ring, see DeviceFrame3D.tsx) has
          mounted, this is hidden so the two don't double up. */}
      {!show3D && (
        <div
          style={{
            position: "absolute",
            top: orientation === "portrait" ? 7 : "50%",
            left: orientation === "portrait" ? "50%" : undefined,
            right: orientation === "portrait" ? undefined : 7,
            transform: orientation === "portrait" ? "translateX(-50%)" : "translateY(-50%)",
            width: orientation === "portrait" ? 62 : 7,
            height: orientation === "portrait" ? 16 : 62,
            borderRadius: 22,
            background: "linear-gradient(145deg, #3a3a42, #0a0a0c)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09), inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 1px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <span
            style={{
              width: orientation === "portrait" ? 11 : 10,
              height: orientation === "portrait" ? 11 : 10,
              borderRadius: "50%",
              background: "radial-gradient(circle at 38% 32%, #3d3d46, #0c0c0f 60%, #000 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 4px rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 35%, #5a6080, #05050a)",
                boxShadow: "0 0 3px rgba(130,150,255,0.65)",
              }}
            />
          </span>
        </div>
      )}
      <div
        ref={screenRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: orientation === "portrait" ? 41 : 27,
          overflow: "hidden",
          background: "#000",
          boxShadow: "inset 0 0 24px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)",
          zIndex: 2,
        }}
      >
        <AnimatePresence>
          <motion.div
            key={active.id + (playing ? "-playing" : "-poster")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.35 }}
            style={{ position: "absolute", inset: 0 }}
          >
            {playing && vid ? (
              <>
                <iframe
                  id={iframeElId}
                  src={`https://www.youtube.com/embed/${vid}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&disablekb=1&iv_load_policy=3&origin=${originParam}`}
                  title={active.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
                />
                {/* Transparent tap target -- YouTube's native controls are hidden (controls=0)
                    in favor of the custom bar below, so tapping the video itself toggles play/pause. */}
                <button
                  onClick={togglePlay}
                  aria-label={playerState.isPlaying ? "Pause" : "Play"}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: isMobile ? 44 : 50,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                />
                {/* Custom control bar: Play, Pause, Previous, Next, Volume/mute, Progress,
                    Time, Fullscreen -- elegant and minimal, sitting over the bottom of the
                    video rather than cluttering the whole screen. */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: isMobile ? "5px 8px 8px" : "7px 12px 10px",
                    background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 65%, transparent 100%)",
                    zIndex: 4,
                  }}
                >
                  <input
                    type="range"
                    min={0}
                    max={playerState.duration || 0}
                    step={0.1}
                    value={Math.min(playerState.currentTime, playerState.duration || 0)}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: CV.P, height: 3, margin: 0, display: "block", cursor: "pointer" }}
                    aria-label="Seek"
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: isMobile ? 2 : 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 10 }}>
                      {items.length > 1 && (
                        <button onClick={goPrev} aria-label="Previous project" style={ctrlBtnStyle}>
                          <PrevIcon size={isMobile ? 13 : 16} />
                        </button>
                      )}
                      <button onClick={togglePlay} aria-label={playerState.isPlaying ? "Pause" : "Play"} style={ctrlBtnStyle}>
                        {playerState.isPlaying ? <PauseIcon size={isMobile ? 14 : 17} /> : <PlayIcon size={isMobile ? 14 : 17} />}
                      </button>
                      {items.length > 1 && (
                        <button onClick={goNext} aria-label="Next project" style={ctrlBtnStyle}>
                          <NextIcon size={isMobile ? 13 : 16} />
                        </button>
                      )}
                      <span style={{ fontSize: isMobile ? 9 : 10, color: "rgba(255,255,255,0.75)", marginLeft: 2, whiteSpace: "nowrap" }}>
                        {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8 }}>
                      <button onClick={toggleMute} aria-label={playerState.muted ? "Unmute" : "Mute"} style={ctrlBtnStyle}>
                        {playerState.muted || playerState.volume === 0 ? <MuteIcon size={isMobile ? 13 : 16} /> : <VolumeIcon size={isMobile ? 13 : 16} />}
                      </button>
                      {!isMobile && (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={playerState.muted ? 0 : playerState.volume}
                          onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
                          style={{ width: 52, accentColor: CV.P, height: 3, cursor: "pointer" }}
                          aria-label="Volume"
                        />
                      )}
                      <button onClick={toggleFullscreen} aria-label="Fullscreen" style={ctrlBtnStyle}>
                        <FullscreenIcon size={isMobile ? 13 : 16} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
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
            <div ref={sheenRef} style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)", pointerEvents: "none" }} />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );

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

        {/* Device frame. Desktop keeps the original smooth width/height/border-radius morph
            (framer's `layout` prop). Mobile gets a literal 3D card-flip (CSS perspective +
            rotateY) whenever the orientation itself changes -- a landscape video shows in a
            landscape phone, a portrait video flips the phone upright -- while switching between
            two videos of the SAME orientation still just cross-fades inside, no flip needed. */}
        <div style={{ display: "flex", justifyContent: "center", perspective: isMobile ? 1400 : 1800 }}>
          <AnimatePresence mode="wait" initial={false}>
            {isMobile ? (
              <motion.div
                key={orientation}
                initial={reduceMotion ? { opacity: 0 } : { rotateY: orientation === "portrait" ? -110 : 110, opacity: 0.15, scale: 0.88 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { rotateY: orientation === "portrait" ? 110 : -110, opacity: 0.15, scale: 0.88 }}
                transition={{ duration: reduceMotion ? 0.15 : 0.75, ease: [0.16, 0.84, 0.44, 1] }}
                style={{
                  scale: frameScale,
                  opacity: frameOpacity,
                  rotateX: frameRotateX,
                  width: frameW,
                  maxWidth: "100%",
                  aspectRatio: frameAspect,
                  borderRadius: orientation === "portrait" ? 44 : 30,
                  background: "linear-gradient(155deg, #55555d 0%, #35353b 16%, #202024 34%, #131316 58%, #0a0a0c 82%, #050506 100%)",
                  // Thin, edge-to-edge bezel -- the cinematic, almost-all-screen presentation
                  // requested, without copying any specific manufacturer's exact camera-cutout
                  // shape or silhouette (the lens stays a plain circle, see frameChrome).
                  padding: 3,
                  boxShadow: `0 40px 90px -20px rgba(0,0,0,0.65), 0 12px 26px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 0 1px ${CV.BORDER}, 0 0 140px -30px rgba(139,92,246,0.35)`,
                  position: "relative",
                  transformStyle: "preserve-3d",
                }}
              >
                {show3D && (
                  <DeviceFrame3D
                    orientation={orientation}
                    accentColor="#8B5CF6"
                    radiusFraction={radiusFraction}
                    scrollProgress={scrollProgressRef}
                  />
                )}
                {frameChrome}
              </motion.div>
            ) : (
              <motion.div
                key="frame-desktop"
                layout
                transition={reduceMotion ? { duration: 0.18 } : { type: "spring", stiffness: 120, damping: 22, mass: 0.9 }}
                style={{
                  scale: frameScale,
                  opacity: frameOpacity,
                  rotateX: frameRotateX,
                  width: frameW,
                  maxWidth: "100%",
                  aspectRatio: frameAspect,
                  borderRadius: orientation === "portrait" ? 44 : 30,
                  background: "linear-gradient(155deg, #55555d 0%, #35353b 16%, #202024 34%, #131316 58%, #0a0a0c 82%, #050506 100%)",
                  padding: 3,
                  boxShadow: `0 40px 90px -20px rgba(0,0,0,0.65), 0 12px 26px -10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 0 1px ${CV.BORDER}, 0 0 140px -30px rgba(139,92,246,0.35)`,
                  position: "relative",
                  transformStyle: "preserve-3d",
                }}
              >
                {show3D && (
                  <DeviceFrame3D
                    orientation={orientation}
                    accentColor="#8B5CF6"
                    radiusFraction={radiusFraction}
                    scrollProgress={scrollProgressRef}
                  />
                )}
                {frameChrome}
              </motion.div>
            )}
          </AnimatePresence>
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

        {/* Horizontal project selector -- click-to-switch, no page reload.
            Mobile-only sizing below (gap/marginTop/padding/width/margins/fontSize) is shrunk
            so the rail reads as a small, compact strip of thumbnails under the player rather
            than a second full-width row -- desktop keeps its original values untouched. */}
        {items.length > 1 && (
          <motion.div
            style={{ opacity: railOpacity, display: "flex", gap: isMobile ? 8 : 14, marginTop: isMobile ? 18 : 44, overflowX: "auto", padding: isMobile ? "4px 4px 6px" : "4px 4px 12px", WebkitOverflowScrolling: "touch", justifyContent: isMobile ? "flex-start" : "center" }}
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
                    width: isMobile ? 82 : 150,
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
                      borderRadius: isMobile ? 5 : 6,
                      overflow: "hidden",
                      background: CV.DARK,
                      marginBottom: isMobile ? 4 : 8,
                      boxShadow: isActive ? `0 0 0 2px ${CV.P}` : `0 0 0 1px ${CV.BORDER}`,
                    }}
                  >
                    {p.coverImage && (
                      <img src={p.coverImage} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  {!isMobile && (
                    <div style={{ fontSize: 9, letterSpacing: 2, color: CV.PL, textTransform: "uppercase", marginBottom: 2 }}>
                      {p.categories?.[0]}
                    </div>
                  )}
                  <div style={{ fontSize: isMobile ? 10 : 12, color: CV.FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
