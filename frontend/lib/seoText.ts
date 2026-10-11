// Keeps every page's <title> and meta description inside the lengths Google shows in full
// (title ~30-62 chars, description ~110-160 chars), whatever text the CMS holds.
// Long text is cut at the end of a sentence where possible, otherwise at a word, never mid-word.
// Short text is completed with a relevant, true line about the business.

const SUFFIX = " Naveed Anjum — photographer and cinematographer in Dubai with 20+ years of experience, serving clients across the UAE.";

export function metaDesc(text: string | undefined | null, max = 158): string {
  let t = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return SUFFIX.trim();
  if (t.length > max) {
    // whole sentences that fit
    const parts = t.match(/[^.!?]+[.!?]+/g) || [];
    let out = "";
    for (const s of parts) { if ((out + s).trim().length > max) break; out += s; }
    out = out.trim();
    if (out.length >= 100) return out;
    const cut = t.slice(0, max - 1);
    return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\-–—\s]+$/, "") + "…";
  }
  if (t.length < 110) {
    if (!/[.!?]$/.test(t)) t += ".";
    const room = max - t.length;
    let add = SUFFIX;
    if (add.length > room) { add = " Naveed Anjum — photographer & cinematographer in Dubai, UAE."; if (add.length > room) add = ""; }
    t += add;
  }
  return t;
}

export function metaTitle(title: string | undefined | null, brand = "Naveed Anjum"): string {
  let t = String(title || "").replace(/\s+/g, " ").trim();
  if (!t) return `${brand} | Photographer & Cinematographer in Dubai`;
  if (t.length < 30) {
    const withBrand = t.includes(brand) ? t : `${t} | ${brand}`;
    const extra = `${withBrand.replace(` - ${brand}`, "").replace(` — ${brand}`, "").replace(` | ${brand}`, "")} | ${brand}, Dubai Photographer`;
    return extra.length <= 62 ? extra : withBrand;
  }
  return t;
}
