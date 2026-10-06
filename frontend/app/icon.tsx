import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// No logo file exists yet in this repo (public/ is currently empty), so the site has never
// had a favicon/tab icon. This generates one at build time -- a simple monogram in the
// site's own brand colors -- rather than leaving browser tabs and bookmarks with a blank
// icon. Swap for a real logo mark any time by replacing this file with a static image.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#140D21",
          borderRadius: 12,
          color: "#A855F7",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 1,
          fontFamily: "sans-serif",
        }}
      >
        NA
      </div>
    ),
    { ...size }
  );
}
