"use client";
// Bento-style masonry gallery + lightbox for /work/[slug] -- same .egallery/.egallery-item
// CSS classes (globals.css) and black&white-to-color hover treatment used across the rest of
// the site, so this page looks consistent with the homepage Featured Work / Work grid rather
// than introducing a new visual language. Each tile also gets a small "Request Permission"
// trigger (only rendered when `permissionEnabled` is true) that opens PermissionRequestModal
// pre-populated with that exact image.
import { useEffect, useState } from "react";
import PermissionRequestModal from "./PermissionRequestModal";

type GalleryImage = { id: string; url: string; caption?: string; orientation?: string };

// MAIN / HERO TILE -- the single most prominent image in the set, shown large and full
// width. Part of the "one large photo + small thumbnails" redesign: replaces the old
// equal-size bento grid for this page specifically (the homepage/Work grid keep their own
// bento layout via the shared .egallery classes -- untouched, not reused here). Click opens
// the same lightbox every other image uses.
function MainImageTile({
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
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", aspectRatio: img.orientation === "landscape" ? "16/9" : "4/5", maxHeight: "80vh", overflow: "hidden", borderRadius: 4, background: "var(--bg-surface-1, #140D21)" }}
    >
      <img
        src={img.url}
        alt={img.caption || projectName}
        loading="eager"
        decoding="async"
        onClick={onOpen}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer", transition: "transform 0.6s ease", transform: hovered ? "scale(1.02)" : "scale(1)" }}
      />
      {/* Hover affordance -- dark wash + expand icon signals the tile opens the lightbox,
          plus a "01 / 08" counter for context. Both fade in only on hover. */}
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
        {String(1).padStart(2, "0")} / {String(total).padStart(2, "0")}
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
          Request Permission
        </button>
      )}
      {img.caption && <div className="egallery-caption">{img.caption}</div>}
    </div>
  );
}

// THUMBNAIL TILE -- small preview of every other image in the set (including the hero, so
// it stays reachable/highlighted-free from this row too). Click opens the lightbox at that
// exact image; per-image "Request Permission" lives in the lightbox now instead of on each
// small thumbnail, so it stays reachable without cluttering a 110px-wide tile.
function ThumbTile({ img, index, active, onOpen }: { img: GalleryImage; index: number; active: boolean; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Open image ${index + 1}`}
      style={{
        flexShrink: 0,
        width: 110,
        height: 78,
        padding: 0,
        border: active ? "2px solid var(--accent-primary, #8B5CF6)" : "1px solid rgba(255,255,255,0.15)",
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        background: "var(--bg-surface-1, #140D21)",
        opacity: hovered ? 1 : 0.82,
        transition: "opacity 0.2s ease, border-color 0.2s ease",
      }}
    >
      <img src={img.url} alt={img.caption || ""} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </button>
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
        <div>
          {/* MAIN + THUMBNAILS -- one large hero photo (the first/cover image) with the rest
              of the set as a small scrollable thumbnail row underneath. Clicking the hero or
              any thumbnail opens the same full lightbox at that exact image. */}
          <MainImageTile
            img={images[0]}
            total={images.length}
            projectName={projectName}
            permissionEnabled={permissionEnabled}
            onOpen={() => setLightboxIndex(0)}
            onRequestPermission={() => setPermissionFor(images[0])}
          />
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
              {images.map((img, i) => (
                <ThumbTile key={img.id} img={img} index={i} active={false} onOpen={() => setLightboxIndex(i)} />
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
          <button
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i === null ? 0 : Math.max(0, i - 1)));
            }}
            style={{ position: "absolute", left: 16, color: "#fff", background: "none", border: "none", fontSize: 48, cursor: "pointer", opacity: 0.5 }}
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
            style={{ position: "absolute", right: 16, color: "#fff", background: "none", border: "none", fontSize: 48, cursor: "pointer", opacity: 0.5 }}
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
          {/* Request Permission for whichever image is currently open -- lives here now
              (instead of on each small thumbnail below) so it stays reachable for every
              image in the set without cluttering a 110px-wide tile. */}
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
              Request Permission
            </button>
          )}
          <div style={{ position: "absolute", bottom: images.length > 1 ? 76 : 16, color: "#777", fontSize: 12, letterSpacing: 3 }}>
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
