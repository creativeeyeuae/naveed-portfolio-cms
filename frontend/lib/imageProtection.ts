// Shared "casual save" deterrent for portfolio photos -- spread onto any <img> that should
// be protected (Homepage Featured Work, /work grid, /work/[slug] galleries + lightbox).
//
// Blocks: right-click "Save Image As" (onContextMenu), drag-and-drop out of the browser
// (draggable + onDragStart), and, paired with the .protected-img CSS class (globals.css),
// the iOS/Android long-press "Save Photo" menu.
//
// Does NOT and cannot block: a screenshot, a browser's dev tools "Save As", or "view
// source" -- no client-side technique can prevent those, so this doesn't pretend to.
// That's why every protected photo also carries a visible watermark (see WatermarkOverlay)
// -- the real protection is "anything copied is marked", not "copying is impossible".
export const protectedImgProps = {
  draggable: false,
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onDragStart: (e: React.DragEvent) => e.preventDefault(),
} as const;

// className to add alongside any existing className/style on a protected <img>.
export const PROTECTED_IMG_CLASS = "protected-img";
