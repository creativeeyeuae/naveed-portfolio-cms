// Repeating "NAVEED ANJUM" watermark layer -- see .wm-overlay in styles/globals.css for the
// actual tiled-SVG pattern. Drop this as a sibling of the <img> it should sit over, inside a
// `position:relative` (or already-relative/absolute) container. pointer-events:none on the
// CSS class means it never blocks clicks, hovers, or buttons layered above/below it.
export default function WatermarkOverlay() {
  return <div className="wm-overlay" aria-hidden="true" />;
}
