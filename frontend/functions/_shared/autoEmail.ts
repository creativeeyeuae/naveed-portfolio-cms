// Automated emails: send a saved CMS template (by its exact name) to one person. If no template
// with that name exists, returns false so the caller keeps using its built-in email -- nothing
// breaks when a template is renamed or deleted.
import { supaAdmin } from "./adminAuth";
import { renderTemplate, substituteVariables } from "./emailRender";
import { resendPayload } from "./emailDeliver";
import { serviceStyle } from "../../lib/emailAutomationTemplates";

export const AUTO_TEMPLATE_NAMES = {
  booking_received: "Booking Received",
  payment_received: "Booking Confirmed",
  booking_cancelled: "Booking Cancelled",
  booking_rescheduled: "Booking Rescheduled",
  booking_reminder: "Session Reminder",
  files_delivered: "Your Files Are Ready",
  account_welcome: "Welcome to Your Client Portal",
  password_reset: "Reset Your Password",
  verify_code: "Verification Code",
  wallet_topup: "Wallet Credit Added",
} as const;

/** Greeting vars: "Welcome, Sarah" when the name is known, just "Welcome" when it isn't. */
export function nameVars(fullName?: string | null): Record<string, string> {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] && !/@/.test(parts[0]) ? parts[0][0].toUpperCase() + parts[0].slice(1) : "";
  return { first_name: first || "there", last_name: parts.slice(1).join(" "), comma_name: first ? `, ${first}` : "", name_sp: first ? ` ${first}` : "" };
}

/** Service-specific checklist vars (picked from the booked service's name). */
export function serviceVars(serviceName?: string | null): Record<string, string> {
  const s = serviceStyle(String(serviceName || ""));
  return { service_label: s.label.toLowerCase(), tip1: s.tips[0] || "", tip2: s.tips[1] || "", tip3: s.tips[2] || "", tip4: s.tips[3] || "" };
}

export async function sendNamedTemplate(env: any, name: string, to: string, vars: Record<string, string>): Promise<boolean> {
  try {
    if (!env.RESEND_API_KEY || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to || ""))) return false;
    const r = await supaAdmin(env, `email_templates?name=ilike.${encodeURIComponent(name)}&select=subject,blocks&limit=1`, { method: "GET" });
    const t = r.ok ? ((await r.json()) as any[])?.[0] : null;
    if (!t || !Array.isArray(t.blocks) || !t.blocks.length) return false;
    const html = renderTemplate(t.blocks, vars);
    const subject = substituteVariables(t.subject || name, vars).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env, to, subject, html)) });
    await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: "system", action: res.ok ? "auto_email_sent" : "auto_email_failed", entity_type: "email_template", details: { template: name, to } }) }).catch(() => {});
    return res.ok;
  } catch { return false; }
}
