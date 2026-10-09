// Automatic client EMAIL for every booking status change (confirm / payment verified / payment
// problem / reschedule / cancel / complete). WhatsApp messages for the same events are sent by
// each endpoint already (forwardClientWhatsAppAlert); this adds the matching email.
//
// Which email is sent:
//   1. If Naveed has saved a template in CMS > Email Designer with one of the names below
//      (e.g. "Booking Confirmation"), THAT design is used -- with booking details filled in via
//      {{booking_ref}} {{booking_date}} {{booking_time}} {{service_name}} {{package_name}}
//      {{total}} {{reason}} plus the usual {{first_name}} {{company}}.
//   2. Otherwise a built-in branded email (hero photo + details table + contact footer) is sent,
//      using the website's own hero photo, phone, email and social links.
// Never throws: a booking action must never fail because an email couldn't be sent.

import { supaAdmin } from "./adminAuth";
import { renderTemplate, substituteVariables } from "./emailRender";
import { resendPayload } from "./emailDeliver";

export type BookingEvent = "confirmed" | "payment_rejected" | "cancelled" | "rescheduled" | "completed";
export type EmailOutcome = "sent" | "no_email" | "not_configured" | "failed";

const TEMPLATE_NAMES: Record<BookingEvent, string[]> = {
  confirmed: ["Booking Confirmation", "Booking Confirmed"],
  payment_rejected: ["Payment Issue", "Payment Rejected"],
  cancelled: ["Booking Cancelled", "Booking Cancellation"],
  rescheduled: ["Booking Rescheduled", "Booking Reschedule"],
  completed: ["Thank You", "Gallery Delivery / Thank You", "Booking Completed"],
};

const COPY: Record<BookingEvent, { subject: string; badge: string; title: string; intro: string; color: string }> = {
  confirmed: { subject: "Your booking is confirmed — {{booking_ref}}", badge: "✓ BOOKING CONFIRMED", title: "See you soon, {{first_name}}!", intro: "Thank you — your booking is confirmed and your date is reserved. Here are the details:", color: "#2e9e5b" },
  payment_rejected: { subject: "Action needed for your booking {{booking_ref}}", badge: "PAYMENT NEEDS ATTENTION", title: "Hi {{first_name}}, a quick update", intro: "We couldn't verify your payment yet. Reason: {{reason}}\n\nPlease upload a new receipt from your client page, or reply to this email and I'll help.", color: "#c27c0e" },
  cancelled: { subject: "Your booking {{booking_ref}} has been cancelled", badge: "BOOKING CANCELLED", title: "Hi {{first_name}},", intro: "Your booking has been cancelled. Reason: {{reason}}\n\nIf this is unexpected or you'd like to book a new date, simply reply to this email.", color: "#c0392b" },
  rescheduled: { subject: "New date for your booking {{booking_ref}}", badge: "BOOKING RESCHEDULED", title: "Your new date, {{first_name}}", intro: "Your booking has been moved. Here are the updated details:", color: "#8B5CF6" },
  completed: { subject: "Thank you, {{first_name}}!", badge: "THANK YOU", title: "It was a pleasure, {{first_name}}", intro: "Thank you for choosing me for your project. Your final images and films will be delivered as agreed. If you enjoyed the experience, a short review would mean a lot.", color: "#8B5CF6" },
};

function fmtDate(d: string): string {
  if (!d) return "";
  const t = new Date(d + "T00:00:00");
  return isNaN(t.getTime()) ? d : t.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export async function emailBookingUpdate(env: any, appointmentId: string, event: BookingEvent, extra: { reason?: string } = {}): Promise<EmailOutcome> {
  try {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return "not_configured";
    const aRes = await supaAdmin(env, `appointments?id=eq.${encodeURIComponent(appointmentId)}&select=*,customers(full_name,email)`, { method: "GET" });
    const appt = aRes.ok ? ((await aRes.json()) as any[])?.[0] : null;
    const email = String(appt?.customers?.email || "").trim();
    if (!appt || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "no_email";

    const full = String(appt.customers?.full_name || "").trim();
    const vars: Record<string, string> = {
      first_name: full.split(/\s+/)[0] || "there",
      last_name: full.split(/\s+/).slice(1).join(" "),
      booking_ref: appt.appointment_ref || appointmentId.slice(0, 8).toUpperCase(),
      booking_date: fmtDate(appt.booking_date),
      booking_time: appt.booking_time || "",
      service_name: appt.service_name || "",
      package_name: appt.package_name || "",
      total: appt.total != null ? `AED ${Number(appt.total).toLocaleString("en-US")}` : "",
      reason: extra.reason || appt.admin_notes || "",
    };

    // 1) Naveed's own saved template, if one is named for this event.
    let html = "", subject = "";
    for (const name of TEMPLATE_NAMES[event]) {
      const tRes = await supaAdmin(env, `email_templates?name=ilike.${encodeURIComponent(name)}&select=subject,name,blocks&limit=1`, { method: "GET" });
      const t = tRes.ok ? ((await tRes.json()) as any[])?.[0] : null;
      if (t && Array.isArray(t.blocks) && t.blocks.length) {
        html = renderTemplate(t.blocks, vars);
        subject = substituteVariables(t.subject || COPY[event].subject, vars);
        break;
      }
    }

    // 2) Built-in branded email using the website's own photo + contact details.
    if (!html) {
      let site: any = {};
      try {
        const sRes = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" });
        const v = sRes.ok ? ((await sRes.json()) as any[])?.[0]?.value : null;
        site = typeof v === "string" ? JSON.parse(v) : v || {};
      } catch {}
      const heroImg = (site.heroSlides || []).map((h: any) => h?.img).find((u: any) => typeof u === "string" && /^https:/i.test(u)) || "";
      const c = COPY[event];
      const row = (k: string, v: string) => (v ? `<tr><td style="color:#8f84a6;padding:10px 14px;">${k}</td><td align="right" style="padding:10px 14px;"><b>${v}</b></td></tr>` : "");
      const details = `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e1ee;border-radius:8px;font-size:14px;font-family:Arial,sans-serif;">${row("Booking", "{{booking_ref}}")}${row("Service", [vars.service_name, vars.package_name].filter(Boolean).join(" — "))}${row("Date", "{{booking_date}}")}${row("Time", "{{booking_time}}")}${row("Total", "{{total}}")}</table>`;
      const site_url = "https://bynaveedanjum.com";
      const blocks: any[] = [
        { type: "settings", bodyBg: "#f3f1f6", cardBg: "#ffffff", font: "lato", headingFont: "playfair", accent: "#8B5CF6", headingColor: "#140D21", textColor: "#3d3648", radius: 10 },
        { type: "hero", image: heroImg, eyebrow: (site.aboutName || "Naveed Anjum").toUpperCase(), title: c.title, subtitle: "", height: 240, overlay: "#0f0a1a", overlayOpacity: 0.55 },
        { type: "text", html: c.badge, align: "center", color: c.color, size: 12, bold: true, padY: 22 },
        { type: "text", html: c.intro, size: 15 },
        event !== "cancelled" ? { type: "html", html: details } : null,
        event === "completed" ? { type: "button", text: "Leave a Review", href: site_url } : { type: "button", text: "Message me on WhatsApp", href: site.waNumber ? `https://wa.me/${String(site.waNumber).replace(/[^\d]/g, "")}` : site_url, btnColor: "#25D366" },
        { type: "text", html: `Warm regards,\n<b>${site.aboutName || "Naveed Anjum"}</b>\nPhotographer · Cinematographer · Dubai`, size: 14, color: "#5d5568" },
        { type: "social", instagram: site.instagram || "", youtube: site.youtube || "", linkedin: site.linkedin || "", tiktok: site.tiktok || "", website: site_url, bg: "#f8f7fb" },
        { type: "contact", phone: site.phone || "", email: site.email || "", website: site_url, address: site.address || site.location || "", size: 12, bg: "#f8f7fb", color: "#5d5568" },
        { type: "footer", align: "center", bg: "#f8f7fb", text: `© ${site.aboutName || "Naveed Anjum"} · Dubai, UAE` },
      ].filter(Boolean);
      html = renderTemplate(blocks, vars);
      subject = substituteVariables(c.subject, vars);
    }
    subject = subject.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(resendPayload(env, email, subject, html)),
    });
    await supaAdmin(env, "audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ actor: "system", action: res.ok ? "booking_email_sent" : "booking_email_failed", entity_type: "appointment", entity_id: appointmentId, details: { event, to: email, status: res.status } }),
    }).catch(() => {});
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
