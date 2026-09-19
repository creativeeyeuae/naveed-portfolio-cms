"use client";
// Editorial photo gallery + lightbox for /work/[slug]. Two parts:
//  1) HERO -- the project's cover image, shown large and full-width on its own so it stays
//     the single most prominent photo on the page (never squeezed into the grid below).
//  2) COLLAGE -- every other photograph in the set, laid out in the site's existing
//     .egallery/.egallery-item bento-masonry CSS (globals.css, also used on the homepage
//     Featured Work / Work grids). Column spans follow a fixed editorial "rhythm" (mostly
//     half-width cards punctuated by occasional small and large ones) capped by each
//     image's own real aspect ratio, so the grid reads as a varied, art-directed collage
//     instead of a uniform two-column repeat -- not just whatever ratio the raw photos
//     happen to be. No horizontal scrollbar. Clicking any photo (hero or collage) opens the
//     same full-screen lightbox with next/previous navigation, unchanged from before.
import { useEffect, useState } from "react";
import PermissionRequestModal from "./PermissionRequestModal";

type GalleryImage = { id: string; url: string; caption?: string; orientation?: string };

// Editorial span rhythm for the collage grid (4-column base) -- deterministic by position,
// not derived purely from the source photos' own aspect ratios. Real conference/event
// photography is overwhelmingly one flavor of "landscape", so sizing spans off ratio alone
// collapses into a monotonous two-column grid; this fixed rhythm guarantees a mix of small
// (1), standard (2) and feature (3/4) cards regardless of what ratios the photos happen to
// be. No two large (3/4) cards ever land next to each other in the sequence.
const SPAN_RHYTHM = [2, 1, 3, 1, 2, 1, 4, 2, 1];

// The rhythm span is still capped by the image's own real aspect ratio so a tall portrait
// photo never gets stretched across 3-4 columns (a bad, over-cropped result) and a true
// panorama is never squeezed into a single narrow column.
function capForRatio(r: number) {
  if (r < 0.85) return 1;
  if (r < 1.35) return 2;
  if (r < 2.2) return 3;
  return 4;
}

function spanForTile(rhythmIndex: number, ratio: number) {
  const rhythm = SPAN_RHYTHM[rhythmIndex % SPAN_RHYTHM.length];
  return Math.max(1, Math.min(rhythm, capForRatio(ratio)));
}

// HERO -- the project's cover photo, full width and on its own row so it stays visually
// dominant no matter its own orientation (a tall portrait hero would look cropped/awkward
// if forced into the column-span grid below, so it never is). Seeds an aspect-ratio guess
// from the CMS `orientation` field to avoid layout jump, then locks to the real ratio once
// the image loads (clamped to a sane range so an extreme photo can't blow out the layout).
function HeroTile({
  img,
  total,
  projectName,
  permissionEnabled,
  onOpen,
  onRequestPermission,
}: {
  img: GalleryImage;
  total: number;
  projectName: string;
  permissionEnabled: boolean;
  onOpen: () => void;
  onRequestPermission: () => void;
}) {
  const [ratio, setRatio] = useState(() => (img.orientation === "landscape" ? 1.6 : img.orientation === "square" ? 1 : 0.8));
  const [hovered, setHovered] = useState(false);
  const clamped = Math.min(1.9, Math.max(0.66, ratio));

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", aspectRatio: String(clamped), maxHeight: "78vh", overflow: "hidden", borderRadius: 6, background: "var(--bg-surface-1, #140D21)", marginBottom: 20 }}
    >
      <img
        src={img.url}
        alt={img.caption || projectName}
        loading="eager"
        decoding="async"
        onClick={onOpen}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth && el.naturalHeight) setRatio(el.naturalWidth / el.naturalHeight);
        }}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer", transition: "transform 0.6s ease", transform: hovered ? "scale(1.02)" : "scale(1)" }}
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
        01 / {String(total).padStart(2, "0")}
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
      {img.caption && <div className="egallery-caption" style={{ opacity: 1, position: "absolute" }}>{img.caption}</div>}
    </div>
  );
}

// COLLAGE TILE -- one photo in the editorial grid below the hero. `rhythmIndex` is this
// tile's position within the collage (0-based, independent of its position in the full
// `images` array) and drives the span rhythm; `absoluteIndex` is its real position in
// `images` and is what gets passed back to open the lightbox at the right photo.
function GalleryTile({
  img,
  rhythmIndex,
  permissionEnabled,
  onOpen,
  onRequestPermission,
}: {
  img: GalleryImage;
  rhythmIndex: number;
  permissionEnabled: boolean;
  onOpen: () => void;
  onRequestPermission: () => void;
}) {
  const seedRatio = img.orientation === "landscape" ? 1.6 : img.orientation === "square" ? 1 : 0.8;
  const [ratio, setRatio] = useState(seedRatio);
  const [hovered, setHovered] = useState(false);
  const span = spanForTile(rhythmIndex, ratio);

  return (
    <div
      className={`egallery-item eg-span-${span}`}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: "var(--bg-surface-1, #140D21)" }}
    >
      <img
        src={img.url}
        alt={img.caption || ""}
        loading="lazy"
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth && el.naturalHeight) setRatio(el.naturalWidth / el.naturalHeight);
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
      {img.caption && <div className="egallery-caption">{img.caption}</div>}
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
            img={images[0]}
            total={images.length}
            projectName={projectName}
            permissionEnabled={permissionEnabled}
            onOpen={() => setLightboxIndex(0)}
            onRequestPermission={() => setPermissionFor(images[0])}
          />
          {rest.length > 0 && (
            <div className="egallery">
              {rest.map((img, i) => (
                <GalleryTile
                  key={img.id}
                  img={img}
                  rhythmIndex={i}
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
