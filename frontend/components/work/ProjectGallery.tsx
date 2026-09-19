"use client";
// Bento-style masonry gallery + lightbox for /work/[slug] -- upgraded from the old
// "one large hero photo + horizontal-scrolling thumbnail strip" layout to the same
// .egallery/.egallery-item bento-masonry system used on the homepage Featured Work /
// Work grids (globals.css), so every project photograph is shown together with no
// horizontal scrollbar. Each tile measures its own image's real aspect ratio on load
// and is given a grid column span accordingly (dense auto-flow packs the gaps); the
// hero (first/cover) image always gets a boosted minimum span so it stays the most
// prominent tile on the page. Clicking any tile opens the same full-screen lightbox
// (prev/next navigation, keyboard, Picture Permission Request) as before -- unchanged.
import { useEffect, useState } from "react";
import PermissionRequestModal from "./PermissionRequestModal";

type GalleryImage = { id: string; url: string; caption?: string; orientation?: string };

// Column span for a given width/height ratio -- wide photos span more columns, tall/square
// ones span fewer, so the grid reads as an art-directed collage rather than a uniform grid.
// The hero tile (index 0) is always floored at span 2 so it stays visually dominant even
// when its own measured ratio (e.g. a portrait shot) wouldn't otherwise earn that span.
function spanForRatio(r: number, isHero: boolean) {
  let span = r >= 2.1 ? 4 : r >= 1.2 ? 2 : 1;
  if (isHero && span < 2) span = 2;
  return span;
}

// GALLERY TILE -- one photo in the bento-masonry grid. Seeds a placeholder span from the
// CMS-provided `orientation` (if any) so there's no layout jump before the image loads,
// then re-measures the image's *real* aspect ratio on `onLoad` and corrects the span.
function GalleryTile({
  img,
  index,
  total,
  isHero,
  permissionEnabled,
  onOpen,
  onRequestPermission,
}: {
  img: GalleryImage;
  index: number;
  total: number;
  isHero: boolean;
  permissionEnabled: boolean;
  onOpen: () => void;
  onRequestPermission: () => void;
}) {
  const seedRatio = img.orientation === "landscape" ? 1.78 : img.orientation === "square" ? 1 : 0.8;
  const [span, setSpan] = useState(() => spanForRatio(seedRatio, isHero));
  const [hovered, setHovered] = useState(false);

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
        loading={isHero ? "eager" : "lazy"}
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth && el.naturalHeight) {
            setSpan(spanForRatio(el.naturalWidth / el.naturalHeight, isHero));
          }
        }}
      />
      {isHero && (
        <div
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            fontSize: 11,
            letterSpacing: 1,
            color: "rgba(255,255,255,0.9)",
            background: "rgba(9,6,14,0.6)",
            padding: "4px 10px",
            borderRadius: 20,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      )}
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

  return (
    <div style={{ marginBottom: 48 }}>
      {images.length > 0 && (
        <div className="egallery">
          {/* BENTO MASONRY GRID -- replaces the old single hero photo + horizontal-scrolling
              thumbnail strip. Every photograph in the set is shown together, at its own real
              aspect ratio, with the hero/cover image boosted to a larger span so it still
              reads as the lead image. No horizontal scrollbar; fully responsive via the
              existing .egallery breakpoints (4 cols desktop -> 2 cols tablet -> 1 col mobile). */}
          {images.map((img, i) => (
            <GalleryTile
              key={img.id}
              img={img}
              index={i}
              total={images.length}
              isHero={i === 0}
              permissionEnabled={permissionEnabled}
              onOpen={() => setLightboxIndex(i)}
              onRequestPermission={() => setPermissionFor(img)}
            />
          ))}
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
