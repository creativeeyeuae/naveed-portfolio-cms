// Public-site renderer for a field edited with components/RichTextEditor.tsx. Renders the
// saved HTML (or, for a row saved before the rich text editor existed, the same plain-text
// paragraph structure the page used to build by hand) with the shared ".rich-text" styles
// from styles/globals.css. No client JS needed -- safe to use directly from a server
// component (about/page.tsx, work/[slug]/page.tsx, journal/[slug]/page.tsx).
import { sanitizeRichText } from "@/lib/richText";
import type { CSSProperties } from "react";

export default function RichText({
  html,
  className,
  style,
}: {
  html?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const safe = sanitizeRichText(html);
  if (!safe) return null;
  return (
    <div
      className={["rich-text", className].filter(Boolean).join(" ")}
      style={style}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
