// One place that turns a rendered email into the exact payload sent to Resend, with every
// inbox-placement best practice applied to EVERY send (test emails and campaigns alike):
//   - Sender shows as "Naveed Anjum" in the inbox (display name added automatically if the
//     EMAIL_FROM secret is just an address; override with EMAIL_FROM_NAME).
//   - Reply-To set, so replies reach Naveed instead of bouncing.
//   - A plain-text version alongside the HTML (HTML-only mail is a common spam signal).
//   - List-Unsubscribe header (Gmail / Yahoo require an easy unsubscribe for bulk mail).
// Real deliverability also needs the domain verified in Resend (SPF + DKIM DNS records) and a
// DMARC record -- that's DNS setup, not code; see the setup notes given to Naveed.

export type DeliverEnv = { EMAIL_FROM?: string; EMAIL_FROM_NAME?: string; EMAIL_REPLY_TO?: string };

const DEFAULT_NAME = "Naveed Anjum";

function bareAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}

export function senderFrom(env: DeliverEnv): string {
  const raw = String(env.EMAIL_FROM || "").trim();
  if (!raw) return raw;
  if (/<[^>]+>/.test(raw)) return raw; // already "Name <address>"
  const name = String(env.EMAIL_FROM_NAME || DEFAULT_NAME).replace(/["<>]/g, "").trim() || DEFAULT_NAME;
  return `${name} <${raw}>`;
}

// Readable plain-text twin of the HTML email.
export function htmlToText(html: string): string {
  return String(html || "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
      const label = txt.replace(/<[^>]+>/g, "").trim();
      return label && !/^https?:/i.test(href) ? label : label ? `${label} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#9742;|&#9993;/g, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function resendPayload(env: DeliverEnv, to: string, subject: string, html: string) {
  const from = senderFrom(env);
  const replyTo = String(env.EMAIL_REPLY_TO || bareAddress(from)).trim();
  return {
    from,
    to: [to],
    subject,
    html,
    text: htmlToText(html),
    reply_to: replyTo || undefined,
    headers: replyTo ? { "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>` } : undefined,
  };
}
