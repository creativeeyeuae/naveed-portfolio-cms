// Shared by every email Function (send-test.ts, campaigns/[id]/send.ts): turns a template's
// `blocks` (the visual designer's block list) into one real, email-client-safe HTML document,
// substitutes {{variables}} with a contact's real data, and sanitizes anything that could
// carry executable content. No block is ever trusted as pre-sanitized -- this always re-runs.

export type EmailBlock =
  | { type: "heading"; text: string }
  | { type: "text"; html: string }
  | { type: "image"; src: string; alt?: string; link?: string }
  | { type: "button"; text: string; href: string }
  | { type: "divider" }
  | { type: "spacer"; height?: number }
  | { type: "footer"; text: string };

// Strips anything that could execute: script tags, on* handlers, javascript:/data: URLs in
// href/src, and disallowed tags entirely (iframe/object/embed/form/style/link/meta). This is
// deliberately conservative -- an email is rendered by mail clients we don't control.
const DISALLOWED_TAGS = /<\/?(script|iframe|object|embed|form|style|link|meta|base)[^>]*>/gi;
const ON_ATTR = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URL = /(href|src)\s*=\s*("|')\s*(javascript:|data:text\/html)[^"']*\2/gi;

export function sanitizeHtml(input: string): string {
  return String(input || "")
    .replace(DISALLOWED_TAGS, "")
    .replace(ON_ATTR, "")
    .replace(DANGEROUS_URL, '$1="#"');
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

// Supported variables: first_name, last_name, company, job_title, event, meeting_date,
// meeting_location, service_interest, sales_person -- same variable set as the WhatsApp
// follow-up templates, so an admin only has to learn one syntax across the whole CMS.
export function substituteVariables(text: string, vars: Record<string, string | null | undefined>): string {
  return String(text || "").replace(VAR_RE, (_m, key) => {
    const v = vars[key.toLowerCase()];
    return v ? escapeHtml(String(v)) : "";
  });
}

function blockToHtml(b: EmailBlock): string {
  switch (b.type) {
    case "heading":
      return `<tr><td style="padding:22px 28px 8px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#140D21;">${sanitizeHtml(b.text || "")}</td></tr>`;
    case "text":
      return `<tr><td style="padding:8px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#3a3245;">${sanitizeHtml(b.html || "")}</td></tr>`;
    case "image": {
      const img = `<img src="${escapeHtml(b.src || "")}" alt="${escapeHtml(b.alt || "")}" style="display:block;width:100%;max-width:544px;height:auto;border:0;" />`;
      const inner = b.link ? `<a href="${escapeHtml(b.link)}" style="text-decoration:none;">${img}</a>` : img;
      return `<tr><td style="padding:8px 28px;">${inner}</td></tr>`;
    }
    case "button":
      return `<tr><td style="padding:18px 28px;" align="center"><a href="${escapeHtml(b.href || "#")}" style="display:inline-block;background:#8B5CF6;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;padding:13px 32px;border-radius:6px;">${escapeHtml(b.text || "")}</a></td></tr>`;
    case "divider":
      return `<tr><td style="padding:0 28px;"><div style="border-top:1px solid #e6e1ee;"></div></td></tr>`;
    case "spacer":
      return `<tr><td style="height:${Math.max(4, Math.min(120, Number(b.height) || 24))}px;"></td></tr>`;
    case "footer":
      return `<tr><td style="padding:24px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#9a92a8;">${sanitizeHtml(b.text || "")}</td></tr>`;
    default:
      return "";
  }
}

// Wraps the rendered blocks in a table-based email skeleton (max width 600px, centered) --
// the layout approach that survives the widest range of email clients, then substitutes
// {{variables}} across the whole document in one pass at the end.
export function renderTemplate(blocks: EmailBlock[], vars: Record<string, string | null | undefined> = {}): string {
  const rows = (Array.isArray(blocks) ? blocks : []).map(blockToHtml).join("\n");
  const doc = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f1f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
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
