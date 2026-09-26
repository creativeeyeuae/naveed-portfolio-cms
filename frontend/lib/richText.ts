// Shared helpers for the CMS Rich Text Editor (components/RichTextEditor.tsx) and its
// public-site renderer (components/RichText.tsx).
//
// Content saved through RichTextEditor is stored as an HTML string in the exact same
// CMS/database field that previously held plain text (aboutBio, a project's
// fullDescription, a blog post's content) -- no schema change, no new column, no new
// table. Rows saved before this feature shipped are still plain text with literal
// "\n" / "\n\n" line breaks; toEditableHtml()/sanitizeRichText() both detect that case
// and convert it into the same paragraph structure the old
// `text.split(/\n+/).map(...)` rendering already produced, so nothing already published
// changes appearance until the owner re-saves that field from the new editor.

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "b", "i",
  "h2", "h3", "h4", "ul", "ol", "li", "a", "blockquote",
]);

/** True once a value has actually been saved from the rich text editor (real markup),
 *  false for legacy plain text (including plain text that merely contains a bare "<"). */
export function isHtmlContent(value?: string | null): boolean {
  if (!value) return false;
  return /<\/?[a-zA-Z][a-zA-Z0-9]*[^<>]*>/.test(value);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Legacy plain-text -> HTML: blank-line-separated blocks become paragraphs, a single
 *  "\n" inside a block becomes a line break -- the same semantics the old
 *  `split(/\n+/).filter(...).map(...)` pages used, just expressed as real markup. */
function plainTextToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** What to load into the Tiptap editor for a field's current saved value. */
export function toEditableHtml(value?: string | null): string {
  if (!value) return "";
  return isHtmlContent(value) ? value : plainTextToHtml(value);
}

/** Safe HTML for dangerouslySetInnerHTML on the public site: keeps only the small
 *  allow-list of tags above (everything else is stripped, text content kept) and only
 *  allows http(s)/mailto/tel hrefs on links, with target/rel forced to safe values.
 *  Legacy plain-text rows are upgraded to paragraph markup on the fly first. */
export function sanitizeRichText(value?: string | null): string {
  const html = toEditableHtml(value);
  if (!html) return "";
  return html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)\/?>/g,
    (full: string, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (full.startsWith("</")) return `</${tag}>`;
      if (tag === "a") {
        const hrefMatch = attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i);
        const href = hrefMatch ? hrefMatch[1] : "";
        if (!/^(https?:|mailto:|tel:)/i.test(href)) return "<a>";
        return `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer nofollow">`;
      }
      return `<${tag}>`;
    }
  );
}
