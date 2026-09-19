"use client";
// Editorial photo gallery + lightbox for /work/[slug]. Two parts:
//  1) HERO -- the project's cover image, shown large and full-width, scaled to fit within
//     a capped-height box with NO cropping (the whole photo is always visible, letterboxed
//     rather than cover-cropped if its own ratio doesn't fill the box).
//  2) COLLAGE -- every other photograph, laid out in a fluid CSS multi-column masonry that
//     expands to however many columns the screen naturally fits (no fixed column count --
//     narrower screens simply get fewer, wider columns), with every photo shown at its own
//     full natural size and aspect ratio -- again, no cropping.
// No horizontal scrollbar. Clicking any photo (hero or collage) opens the same full-screen
// lightbox with next/previous navigation, unchanged from before.
import { useEffect, useState } from "react";
import PermissionRequestModal from "./PermissionRequestModal";

type GalleryImage = { id: string; url: string; caption?: string; orientation?: string };

// HERO -- the project's cover photo. `max-width/max-height` + `width:auto/height:auto`
// (no object-fit box) means the browser scales the image down only as much as needed to
// fit the available width and the height cap, always preserving its real aspect ratio and
// never cropping any part of it.
function HeroTile({
  img,
  index,
  total,
  projectName,
  permissionEnabled,
  onOpen,
  onRequestPermission,
  onHoverChange,
}: {
  img: GalleryImage;
  index: number;
  total: number;
  projectName: string;
  permissionEnabled: boolean;
  onOpen: () => void;
  onRequestPermission: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Cross-fade -- when the auto-advance timer in the parent swaps `img` out from under
  // this tile, briefly drop opacity to 0 and rAF it back to 1 so the change reads as a
  // fade rather than an abrupt pop.
  const [fadeIn, setFadeIn] = useState(true);
  useEffect(() => {
    setFadeIn(false);
    const raf = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(raf);
  }, [img.id]);

  return (
    <div
      onMouseEnter={() => {
        setHovered(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHoverChange?.(false);
      }}
      style={{ position: "relative", display: "flex", justifyContent: "center", width: "100%", borderRadius: 6, overflow: "hidden", background: "var(--bg-surface-1, #140D21)", marginBottom: 20 }}
    >
      <img
        src={img.url}
        alt={img.caption || projectName}
        loading="eager"
        decoding="async"
        onClick={onOpen}
        style={{ maxWidth: "100%", maxHeight: "80vh", width: "auto", height: "auto", display: "block", cursor: "pointer", opacity: fadeIn ? 1 : 0, transition: "transform 0.6s ease, opacity 0.5s ease", transform: hovered ? "scale(1.01)" : "scale(1)" }}
      />
      {/* Hover affordance -- dark wash + expand icon signals the hero opens the lightbox,
          plus a "01 / NN" counter for context. Both fade in only on hover. */}
      <div
        onClick={onOpen}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(9,6,14,0.24)",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: hovered ? "auto" : "none",
        }}
      >
        <span style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22 }}>⤢</span>
      </div>
      <div style={{ position: "absolute", left: 14, bottom: 14, fontSize: 11, letterSpacing: 1, color: "rgba(255,255,255,0.9)", background: "rgba(9,6,14,0.6)", padding: "4px 10px", borderRadius: 20, opacity: hovered ? 1 : 0, transition: "opacity 0.3s ease" }}>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      {permissionEnabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestPermission();
          }}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 2,
            background: "rgba(9,6,14,0.72)",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            fontSize: 11,
            letterSpacing: 0.5,
            padding: "7px 12px",
            cursor: "pointer",
            opacity: 0.9,
          }}
        >
          Picture Permission Request
        </button>
      )}
      {img.caption && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "20px 16px 14px",
            fontSize: 12,
            letterSpacing: 0.5,
            color: "#fff",
            lineHeight: 1.4,
            background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
          }}
        >
          {img.caption}
        </div>
      )}
    </div>
  );
}

// COLLAGE TILE -- one photo in the fluid masonry below the hero. No forced box or crop:
// `width:100%, height:auto` inside a CSS multi-column container means every tile renders
// at its own true aspect ratio, and `break-inside:avoid` keeps a tile from being split
// across two columns.
function GalleryTile({
  img,
  permissionEnabled,
  onOpen,
  onRequestPermission,
}: {
  img: GalleryImage;
  permissionEnabled: boolean;
  onOpen: () => void;
  onRequestPermission: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        breakInside: "avoid",
        marginBottom: 16,
        borderRadius: 6,
        overflow: "hidden",
        cursor: "pointer",
        background: "var(--bg-surface-1, #140D21)",
      }}
    >
      <img
        src={img.url}
        alt={img.caption || ""}
        loading="lazy"
        decoding="async"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          filter: hovered ? "grayscale(0)" : "grayscale(1)",
          transform: hovered ? "scale(1.02)" : "scale(1)",
          transition: "transform 0.5s ease, filter 0.5s ease",
        }}
      />
      {permissionEnabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestPermission();
          }}
          title="Picture Permission Request"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            background: "rgba(9,6,14,0.72)",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            fontSize: 10,
            letterSpacing: 0.5,
            padding: "6px 10px",
            cursor: "pointer",
            opacity: hovered ? 1 : 0.82,
            transition: "opacity 0.2s ease",
          }}
        >
          Request Permission
        </button>
      )}
      {img.caption && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "20px 16px 14px",
            fontSize: 12,
            letterSpacing: 0.5,
            color: "#fff",
            lineHeight: 1.4,
            background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          {img.caption}
        </div>
      )}
    </div>
  );
}

export default function ProjectGallery({
  projectId,
  projectName,
  images,
  reels,
  permissionEnabled,
}: {
  projectId: string;
  projectName: string;
  images: GalleryImage[];
  reels?: string[];
  permissionEnabled: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [permissionFor, setPermissionFor] = useState<GalleryImage | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroHovered, setHeroHovered] = useState(false);

  // Auto-advance the hero photo every 2 seconds, cycling through every image in the
  // gallery (not just the collage tiles below it). Pauses while the hero is hovered so it
  // doesn't fight with the hover-reveal overlay/counter/permission button, and stops
  // entirely while the lightbox is open so it can't silently move the hero underneath it.
  useEffect(() => {
    if (images.length <= 1 || heroHovered || lightboxIndex !== null) return;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % images.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [images.length, heroHovered, lightboxIndex]);

  // Keyboard navigation while the lightbox is open -- Left/Right to step through images,
  // Escape to close. Only attaches the listener while a lightbox is actually showing.
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? 0 : Math.max(0, i - 1)));
      else if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? 0 : Math.min(images.length - 1, i + 1)));
      else if (e.key === "Escape") setLightboxIndex(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, images.length]);

  if (!images.length && !(reels && reels.length)) return null;

  const rest = images.slice(1);

  return (
    <div style={{ marginBottom: 48 }}>
      {images.length > 0 && (
        <div>
          <HeroTile
            img={images[heroIndex]}
            index={heroIndex}
            total={images.length}
            projectName={projectName}
            permissionEnabled={permissionEnabled}
            onOpen={() => setLightboxIndex(heroIndex)}
            onRequestPermission={() => setPermissionFor(images[heroIndex])}
            onHoverChange={setHeroHovered}
          />
          {rest.length > 0 && (
            <div
              style={{
                columnWidth: 300,
                columnGap: 16,
              }}
            >
              {rest.map((img, i) => (
                <GalleryTile
                  key={img.id}
                  img={img}
                  permissionEnabled={permissionEnabled}
                  onOpen={() => setLightboxIndex(i + 1)}
                  onRequestPermission={() => setPermissionFor(img)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {reels && reels.length > 0 && (
        <div style={{ marginTop: images.length > 0 ? 24 : 0, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {reels.map((r, i) => (
            <a
              key={i}
              href={r}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                border: "1px solid var(--border-subtle, #2D1F45)",
                color: "var(--text-secondary, #E2D9F3)",
                padding: "10px 20px",
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: 2,
              }}
            >
              View Reel {i + 1}
            </a>
          ))}
        </div>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.98)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {/* Prev/Next -- a solid circular pill (not bare text) so the arrows read clearly
              against any photo, on both mobile touch and desktop hover, without relying on
              a hover state that touch screens never trigger. */}
          <button
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i === null ? 0 : Math.max(0, i - 1)));
            }}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "50%",
              fontSize: 26,
              lineHeight: 1,
              cursor: "pointer",
              opacity: 0.95,
            }}
          >
            ‹
          </button>
          <figure onClick={(e) => e.stopPropagation()} style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <img src={images[lightboxIndex].url} alt={images[lightboxIndex].caption || ""} style={{ maxWidth: "92vw", maxHeight: "84vh", objectFit: "contain" }} />
            {images[lightboxIndex].caption && (
              <figcaption style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, letterSpacing: 0.5, textAlign: "center", maxWidth: "80vw" }}>{images[lightboxIndex].caption}</figcaption>
            )}
          </figure>
          <button
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i === null ? 0 : Math.min(images.length - 1, i + 1)));
            }}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "50%",
              fontSize: 26,
              lineHeight: 1,
              cursor: "pointer",
              opacity: 0.95,
            }}
          >
            ›
          </button>
          <button
            aria-label="Close"
            onClick={() => setLightboxIndex(null)}
            style={{ position: "absolute", top: 16, right: 16, color: "#fff", background: "none", border: "none", fontSize: 24, cursor: "pointer" }}
          >
            ✕
          </button>
          {/* Request Permission for whichever image is currently open -- lives here too
              (in addition to each grid tile) so it's always reachable for the exact image
              currently on screen. */}
          {permissionEnabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPermissionFor(images[lightboxIndex]);
              }}
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 20,
                fontSize: 12,
                letterSpacing: 0.5,
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Picture Permission Request
            </button>
          )}
          {/* Image counter -- solid pill (instead of plain low-contrast gray text) so the
              current position is legible on any photo, on mobile and desktop alike. */}
          <div
            style={{
              position: "absolute",
              bottom: images.length > 1 ? 76 : 16,
              color: "rgba(255,255,255,0.95)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 20,
              padding: "6px 14px",
            }}
          >
            {String(lightboxIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </div>

          {/* THUMBNAIL STRIP -- quick-jump between images without stepping one at a time.
              Only rendered when there's more than one image. */}
          {images.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", bottom: 16, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, padding: "0 16px", overflowX: "auto" }}
            >
              {images.map((img, i) => (
                <button
                  key={img.id}
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    flexShrink: 0,
                    width: 52,
                    height: 40,
                    padding: 0,
                    border: i === lightboxIndex ? "2px solid var(--accent-primary, #8B5CF6)" : "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    opacity: i === lightboxIndex ? 1 : 0.55,
                    transition: "opacity 0.2s, border-color 0.2s",
                  }}
                >
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {permissionFor && (
        <PermissionRequestModal
          projectId={projectId}
          projectName={projectName}
          imageId={permissionFor.id}
          imageUrl={permissionFor.url}
          onClose={() => setPermissionFor(null)}
        />
      )}
    </div>
  );
}
