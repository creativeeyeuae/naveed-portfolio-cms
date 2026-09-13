"use client";
// Bento-style masonry gallery + lightbox for /work/[slug] -- same .egallery/.egallery-item
// CSS classes (globals.css) and black&white-to-color hover treatment used across the rest of
// the site, so this page looks consistent with the homepage Featured Work / Work grid rather
// than introducing a new visual language. Each tile also gets a small "Request Permission"
// trigger (only rendered when `permissionEnabled` is true) that opens PermissionRequestModal
// pre-populated with that exact image.
import { useState } from "react";
import PermissionRequestModal from "./PermissionRequestModal";

type GalleryImage = { id: string; url: string; caption?: string; orientation?: string };

// Mirrors app/page.tsx's GalleryTile exactly: seed a span + placeholder ratio from the CMS-
// stored orientation so the tile has a sensible size before the real image loads (avoids a
// layout jump), then refine both from the image's actual measured dimensions once it decodes.
function GalleryTile({
  img,
  index,
  projectName,
  permissionEnabled,
  onOpen,
  onRequestPermission,
}: {
  img: GalleryImage;
  index: number;
  projectName: string;
  permissionEnabled: boolean;
  onOpen: () => void;
  onRequestPermission: () => void;
}) {
  const guess = img.orientation === "landscape" ? 2 : 1;
  const [span, setSpan] = useState(index === 0 && guess === 2 ? 3 : guess);
  const [ratio, setRatio] = useState(img.orientation === "landscape" ? 3 / 2 : 3 / 4);
  const [loaded, setLoaded] = useState(false);

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const el = e.currentTarget;
    const r = el.naturalWidth / el.naturalHeight;
    let s = r >= 2.1 ? 4 : r >= 1.2 ? 2 : 1;
    if (index === 0 && s < 2 && r >= 0.9) s = 2;
    setRatio(r);
    setSpan(s);
    setLoaded(true);
  }

  return (
    <div className={`egallery-item eg-span-${span}`} style={{ position: "relative", aspectRatio: loaded ? "auto" : ratio, background: "var(--bg-surface-1, #140D21)" }}>
      <img
        src={img.url}
        alt={img.caption || projectName}
        loading={index < 2 ? "eager" : "lazy"}
        decoding="async"
        onLoad={handleLoad}
        onClick={onOpen}
        style={{ width: "100%", height: loaded ? "auto" : "100%", objectFit: loaded ? undefined : "cover", display: "block", cursor: "pointer" }}
      />
      {permissionEnabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestPermission();
          }}
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
            opacity: 0.85,
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

  if (!images.length && !(reels && reels.length)) return null;

  return (
    <div style={{ marginBottom: 48 }}>
      {images.length > 0 && (
        <div className="egallery">
          {images.map((img, i) => (
            <GalleryTile
              key={img.id}
              img={img}
              index={i}
              projectName={projectName}
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
          <div style={{ position: "absolute", bottom: 16, color: "#777", fontSize: 12, letterSpacing: 3 }}>
            {String(lightboxIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </div>
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
