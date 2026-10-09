// ONE renderer for email templates, shared by the server (send-test.ts, campaigns/[id]/send.ts)
// AND the CMS designer's live preview (HomeClient.tsx imports this same file) -- so the preview
// is exactly what recipients receive. Plain TS, no Worker/DOM APIs, safe in both places.
//
// Everything lives inside the template's existing `blocks` jsonb (no DB migration):
//   - an optional {type:"settings"} block = global design (colours, fonts, width, corners)
//   - normal content blocks, each with optional style fields (align, color, size, font, bg, bold)
//   - or a single {type:"rawhtml"} block = a complete email imported from another tool
// Every piece of HTML is sanitized on every render -- nothing is trusted as pre-sanitized.

export type BlockStyle = {
  align?: "left" | "center" | "right";
  color?: string;
  size?: number;
  font?: string;
  bg?: string;
  bold?: boolean;
  padY?: number;
};

export type EmailSettings = {
  type: "settings";
  bodyBg?: string;
  cardBg?: string;
  width?: number;
  font?: string;
  headingFont?: string;
  textColor?: string;
  headingColor?: string;
  accent?: string;
  radius?: number;
  preheader?: string;
};

export type EmailBlock =
  | EmailSettings
  | ({ type: "heading"; text: string } & BlockStyle)
  | ({ type: "text"; html: string } & BlockStyle)
  | ({ type: "image"; src: string; alt?: string; link?: string; width?: number } & BlockStyle)
  | ({ type: "logo"; src: string; alt?: string; link?: string; width?: number } & BlockStyle)
  | ({ type: "button"; text: string; href: string; btnColor?: string; btnTextColor?: string; radius?: number } & BlockStyle)
  | ({ type: "divider"; lineColor?: string } & BlockStyle)
  | ({ type: "spacer"; height?: number } & BlockStyle)
  | ({ type: "social"; instagram?: string; facebook?: string; youtube?: string; linkedin?: string; tiktok?: string; website?: string; whatsapp?: string } & BlockStyle)
  | ({ type: "html"; html: string } & BlockStyle)
  | ({ type: "footer"; text: string } & BlockStyle)
  | { type: "rawhtml"; html: string };

// Email-safe font stacks. Google fonts load in Apple Mail / iOS / many webmail clients and fall
// back gracefully (to the stack after them) everywhere else, e.g. Outlook desktop.
export const EMAIL_FONTS: { key: string; label: string; stack: string; google?: string }[] = [
  { key: "arial", label: "Arial", stack: "Arial,Helvetica,sans-serif" },
  { key: "helvetica", label: "Helvetica", stack: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  { key: "verdana", label: "Verdana", stack: "Verdana,Geneva,sans-serif" },
  { key: "tahoma", label: "Tahoma", stack: "Tahoma,Geneva,sans-serif" },
  { key: "trebuchet", label: "Trebuchet MS", stack: "'Trebuchet MS',Helvetica,sans-serif" },
  { key: "georgia", label: "Georgia (serif)", stack: "Georgia,'Times New Roman',serif" },
  { key: "times", label: "Times New Roman", stack: "'Times New Roman',Times,serif" },
  { key: "courier", label: "Courier New", stack: "'Courier New',Courier,monospace" },
  { key: "playfair", label: "Playfair Display (luxury serif)", stack: "'Playfair Display',Georgia,serif", google: "Playfair+Display:wght@400;700" },
  { key: "cormorant", label: "Cormorant Garamond (elegant)", stack: "'Cormorant Garamond',Georgia,serif", google: "Cormorant+Garamond:wght@400;600;700" },
  { key: "montserrat", label: "Montserrat (modern)", stack: "Montserrat,Arial,sans-serif", google: "Montserrat:wght@400;600;700" },
  { key: "poppins", label: "Poppins", stack: "Poppins,Arial,sans-serif", google: "Poppins:wght@400;600;700" },
  { key: "lato", label: "Lato", stack: "Lato,Arial,sans-serif", google: "Lato:wght@400;700" },
  { key: "raleway", label: "Raleway", stack: "Raleway,Arial,sans-serif", google: "Raleway:wght@400;600;700" },
];
function fontStack(key: string | undefined, fallback: string): string {
  return EMAIL_FONTS.find((f) => f.key === key)?.stack || fallback;
}

export const DEFAULT_SETTINGS: Required<Omit<EmailSettings, "type">> = {
  bodyBg: "#f4f1f9",
  cardBg: "#ffffff",
  width: 600,
  font: "arial",
  headingFont: "georgia",
  textColor: "#3a3245",
  headingColor: "#140D21",
  accent: "#8B5CF6",
  radius: 10,
  preheader: "",
};

// ── Sanitizing ───────────────────────────────────────────────────────────────
// Snippets (text/footer/custom html blocks): strip anything executable + structural tags.
const DISALLOWED_TAGS = /<\/?(script|iframe|object|embed|form|style|link|meta|base|frame|frameset|applet)[^>]*>/gi;
const SCRIPT_BLOCK = /<script[\s\S]*?<\/script>/gi;
const ON_ATTR = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URL = /(href|src|background|action)\s*=\s*("|')\s*(javascript:|vbscript:|data:text\/html)[^"']*\2/gi;

export function sanitizeHtml(input: string): string {
  return String(input || "")
    .replace(SCRIPT_BLOCK, "")
    .replace(DISALLOWED_TAGS, "")
    .replace(ON_ATTR, "")
    .replace(DANGEROUS_URL, '$1="#"');
}

// Full imported documents keep <style>/<head>/<meta>/<link rel=stylesheet> (real email designs
// depend on them) but still lose everything executable.
export function sanitizeDocument(input: string): string {
  return String(input || "")
    .replace(SCRIPT_BLOCK, "")
    .replace(/<\/?(script|iframe|object|embed|form|base|frame|frameset|applet)[^>]*>/gi, "")
    .replace(/<meta[^>]+http-equiv\s*=\s*["']?refresh[^>]*>/gi, "")
    .replace(ON_ATTR, "")
    .replace(DANGEROUS_URL, '$1="#"')
    .replace(/expression\s*\(/gi, "(")
    .replace(/url\(\s*["']?\s*javascript:[^)]*\)/gi, "none");
}

function escapeHtml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// Colours are free text from the CMS -- only allow plain CSS colour values into style attributes.
function safeColor(c: string | undefined, fallback: string): string {
  const v = String(c || "").trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(v) ? v : fallback;
}
function safeUrl(u: string | undefined): string {
  const v = String(u || "").trim();
  return /^(https?:|mailto:|tel:|#|\{\{)/i.test(v) || /^data:image\//i.test(v) ? escapeHtml(v) : "#";
}
function num(n: unknown, min: number, max: number, def: number): number {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? Math.max(min, Math.min(max, x)) : def;
}
// Plain text typed in the CMS: keep line breaks. Text that already contains tags is used as HTML.
function textToHtml(s: string): string {
  const t = String(s || "");
  return /<[a-z][\s\S]*>/i.test(t) ? t : t.replace(/\r?\n/g, "<br>");
}

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

// Supported variables: first_name, last_name, company, job_title, event, meeting_date,
// meeting_location, service_interest, sales_person.
export function substituteVariables(text: string, vars: Record<string, string | null | undefined>): string {
  return String(text || "").replace(VAR_RE, (_m, key) => {
    const v = vars[key.toLowerCase()];
    return v ? escapeHtml(String(v)) : "";
  });
}

// ── Social icons (hosted PNGs are the only icon format every mail client shows) ──────────
const SOCIAL: { key: string; label: string; icon: string; href: (v: string) => string }[] = [
  { key: "instagram", label: "Instagram", icon: "https://cdn-icons-png.flaticon.com/64/2111/2111463.png", href: (v) => v },
  { key: "facebook", label: "Facebook", icon: "https://cdn-icons-png.flaticon.com/64/733/733547.png", href: (v) => v },
  { key: "youtube", label: "YouTube", icon: "https://cdn-icons-png.flaticon.com/64/1384/1384060.png", href: (v) => v },
  { key: "linkedin", label: "LinkedIn", icon: "https://cdn-icons-png.flaticon.com/64/3536/3536505.png", href: (v) => v },
  { key: "tiktok", label: "TikTok", icon: "https://cdn-icons-png.flaticon.com/64/3046/3046121.png", href: (v) => v },
  { key: "whatsapp", label: "WhatsApp", icon: "https://cdn-icons-png.flaticon.com/64/733/733585.png", href: (v) => (/^https?:/i.test(v) ? v : `https://wa.me/${v.replace(/[^\d]/g, "")}`) },
  { key: "website", label: "Website", icon: "https://cdn-icons-png.flaticon.com/64/1006/1006771.png", href: (v) => v },
];

function blockToHtml(b: any, s: typeof DEFAULT_SETTINGS): string {
  const align = b.align === "center" || b.align === "right" ? b.align : "left";
  const pad = (top: number, bottom: number) => {
    const y = b.padY !== undefined ? num(b.padY, 0, 80, top) : null;
    return `padding:${y ?? top}px 28px ${y ?? bottom}px;`;
  };
  const bg = b.bg ? `background:${safeColor(b.bg, "transparent")};` : "";
  const weight = b.bold ? "font-weight:700;" : "";
  const bodyFont = fontStack(s.font, "Arial,Helvetica,sans-serif");
  const headFont = fontStack(s.headingFont, "Georgia,serif");
  switch (b.type) {
    case "heading":
      return `<tr><td align="${align}" style="${pad(22, 8)}${bg}text-align:${align};font-family:${fontStack(b.font, headFont)};font-size:${num(b.size, 12, 60, 24)}px;line-height:1.3;color:${safeColor(b.color, s.headingColor)};${b.bold ? "font-weight:700;" : "font-weight:400;"}">${sanitizeHtml(b.text || "")}</td></tr>`;
    case "text":
      return `<tr><td align="${align}" style="${pad(8, 8)}${bg}text-align:${align};font-family:${fontStack(b.font, bodyFont)};font-size:${num(b.size, 10, 30, 14)}px;line-height:1.7;color:${safeColor(b.color, s.textColor)};${weight}">${sanitizeHtml(textToHtml(b.html || ""))}</td></tr>`;
    case "logo":
    case "image": {
      if (!b.src) return "";
      const isLogo = b.type === "logo";
      const w = isLogo ? num(b.width, 40, 400, 160) : num(b.width, 40, s.width - 56, s.width - 56);
      const img = `<img src="${safeUrl(b.src)}" alt="${escapeHtml(b.alt || "")}" width="${w}" style="display:${align === "center" ? "block;margin:0 auto" : "inline-block"};width:100%;max-width:${w}px;height:auto;border:0;outline:none;${isLogo ? "" : "border-radius:6px;"}" />`;
      const inner = b.link ? `<a href="${safeUrl(b.link)}" style="text-decoration:none;">${img}</a>` : img;
      return `<tr><td align="${align}" style="${pad(isLogo ? 24 : 8, isLogo ? 12 : 8)}${bg}text-align:${align};">${inner}</td></tr>`;
    }
    case "button": {
      const btnBg = safeColor(b.btnColor, s.accent);
      const btnFg = safeColor(b.btnTextColor, "#ffffff");
      const r = b.radius !== undefined ? num(b.radius, 0, 40, 6) : 6;
      const bAlign = b.align ? align : "center";
      return `<tr><td align="${bAlign}" style="${pad(18, 18)}${bg}text-align:${bAlign};"><a href="${safeUrl(b.href)}" style="display:inline-block;background:${btnBg};color:${btnFg};text-decoration:none;font-family:${fontStack(b.font, bodyFont)};font-size:${num(b.size, 11, 24, 14)}px;font-weight:600;padding:14px 34px;border-radius:${r}px;">${escapeHtml(b.text || "")}</a></td></tr>`;
    }
    case "divider":
      return `<tr><td style="${pad(8, 8)}${bg}"><div style="border-top:1px solid ${safeColor(b.lineColor, "#e6e1ee")};font-size:0;line-height:0;">&nbsp;</div></td></tr>`;
    case "spacer":
      return `<tr><td style="height:${num(b.height, 4, 160, 24)}px;font-size:0;line-height:0;${bg}">&nbsp;</td></tr>`;
    case "social": {
      const items = SOCIAL.filter((x) => String(b[x.key] || "").trim()).map((x) =>
        `<a href="${safeUrl(x.href(String(b[x.key]).trim()))}" style="display:inline-block;margin:0 6px;text-decoration:none;"><img src="${x.icon}" width="28" height="28" alt="${x.label}" style="display:block;border:0;" /></a>`
      );
      if (!items.length) return "";
      const sAlign = b.align ? align : "center";
      return `<tr><td align="${sAlign}" style="${pad(14, 14)}${bg}text-align:${sAlign};">${items.join("")}</td></tr>`;
    }
    case "html":
      return `<tr><td style="${pad(8, 8)}${bg}font-family:${bodyFont};color:${s.textColor};">${sanitizeHtml(b.html || "")}</td></tr>`;
    case "footer":
      return `<tr><td align="${align}" style="${pad(24, 28)}${bg}text-align:${align};font-family:${fontStack(b.font, bodyFont)};font-size:${num(b.size, 9, 16, 11)}px;line-height:1.6;color:${safeColor(b.color, "#9a92a8")};">${sanitizeHtml(textToHtml(b.text || ""))}</td></tr>`;
    default:
      return "";
  }
}

export function getSettings(blocks: EmailBlock[]): typeof DEFAULT_SETTINGS {
  const raw = (Array.isArray(blocks) ? blocks : []).find((b: any) => b?.type === "settings") as EmailSettings | undefined;
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) } as any;
  delete s.type;
  return {
    ...s,
    bodyBg: safeColor(s.bodyBg, DEFAULT_SETTINGS.bodyBg),
    cardBg: safeColor(s.cardBg, DEFAULT_SETTINGS.cardBg),
    textColor: safeColor(s.textColor, DEFAULT_SETTINGS.textColor),
    headingColor: safeColor(s.headingColor, DEFAULT_SETTINGS.headingColor),
    accent: safeColor(s.accent, DEFAULT_SETTINGS.accent),
    width: num(s.width, 480, 800, 600),
    radius: s.radius === 0 ? 0 : num(s.radius, 0, 30, 10),
  };
}

// Renders a template to one complete, email-client-safe HTML document (table layout), then
// substitutes {{variables}} across the whole document in one pass.
export function renderTemplate(blocks: EmailBlock[], vars: Record<string, string | null | undefined> = {}): string {
  const list = Array.isArray(blocks) ? blocks : [];
  const raw = list.find((b: any) => b?.type === "rawhtml") as { html: string } | undefined;
  if (raw) {
    let doc = sanitizeDocument(raw.html || "");
    if (!/<html[\s>]/i.test(doc)) doc = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body>${doc}</body></html>`;
    return substituteVariables(doc, vars);
  }
  const s = getSettings(list);
  const usedFonts = new Set<string>([s.font, s.headingFont]);
  list.forEach((b: any) => b?.font && usedFonts.add(b.font));
  const googles = EMAIL_FONTS.filter((f) => f.google && usedFonts.has(f.key)).map((f) => f.google);
  const fontLink = googles.length ? `<link href="https://fonts.googleapis.com/css2?${googles.map((g) => `family=${g}`).join("&")}&display=swap" rel="stylesheet" />` : "";
  const rows = list.filter((b: any) => b?.type !== "settings").map((b) => blockToHtml(b, s)).join("\n");
  const pre = s.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(s.preheader)}</div>` : "";
  const doc = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />${fontLink}
<style>@media (max-width:620px){.card{width:100%!important;border-radius:0!important}td{padding-left:18px!important;padding-right:18px!important}}</style></head>
<body style="margin:0;padding:0;background:${s.bodyBg};">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${s.bodyBg};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" class="card" width="${s.width}" cellpadding="0" cellspacing="0" style="max-width:${s.width}px;width:100%;background:${s.cardBg};border-radius:${s.radius}px;overflow:hidden;">
${rows}
</table>
</td></tr>
</table>
</body></html>`;
  return substituteVariables(doc, vars);
}

export function varsForCustomer(c: any): Record<string, string> {
  const firstName = String(c?.full_name || "").trim().split(/\s+/)[0] || "";
  const lastName = String(c?.full_name || "").trim().split(/\s+/).slice(1).join(" ");
  return {
    first_name: firstName,
    last_name: lastName,
    company: c?.company || "",
    job_title: c?.job_title || "",
  };
}
