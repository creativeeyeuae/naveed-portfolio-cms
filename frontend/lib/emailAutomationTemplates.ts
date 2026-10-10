// Automated (transactional) emails — one design per event, in the SAME block format and house
// style as lib/emailStarterTemplates.ts, so every one opens in CMS > Email Designer and can be
// edited like any other template. Variables: {{first_name}} {{booking_ref}} {{service_name}}
// {{package_name}} {{booking_date}} {{booking_time}} {{total}} {{reason}} {{link}} {{code}}
// {{amount}} {{balance}} {{photos}} {{videos}} {{expires}}.
import { DEFAULT_BRAND, type EmailBrand } from "./emailStarterTemplates";

const PURPLE = "#8B5CF6", INK = "#140D21", GREEN = "#16A34A", AMBER = "#B45309", RED = "#B91C1C";

/** Per-service hero photo + "how to prepare" tips, picked by keywords in the service name. */
export const SERVICE_STYLES: { key: string; label: string; match: RegExp; tips: string[] }[] = [
  { key: "real-estate", label: "Real Estate & Interiors", match: /real\s*estate|interior|property|architect|villa/i, tips: ["Open all curtains and switch on every light", "Clear counters, remove personal items and cables", "Make the beds and fluff cushions", "Keep cars and bins out of the front view"] },
  { key: "event", label: "Events & Exhibitions", match: /event|exhibition|conference|wedding|party|gala/i, tips: ["Send the run-of-show / agenda", "Share the names of VIPs and key moments", "Confirm venue access and parking for the crew", "Tell us any branding to capture (stage, booth, logos)"] },
  { key: "corporate", label: "Corporate & Headshots", match: /corporate|headshot|portrait|executive|branding|personal/i, tips: ["Bring 2–3 outfit options (solid colours work best)", "Plan 10 minutes for grooming before your slot", "Tell us where the photos will be used", "Book a quiet room with a window if on-site"] },
  { key: "product", label: "Product & Food", match: /product|food|e-?commerce|menu|catalog/i, tips: ["Prepare clean, unboxed samples (plus spares)", "Send your brand colours and reference images", "List the shots / angles you need", "Tell us the final sizes (web, Amazon, print, social)"] },
  { key: "video", label: "Videography & Film", match: /video|film|cinemat|reel|commercial|drone|aerial/i, tips: ["Share the script, storyboard or key messages", "Confirm who will be on camera", "Send music or brand references you like", "Book a quiet location for interviews"] },
  { key: "photo", label: "Photography", match: /.*/, tips: ["Share any reference images you love", "Confirm location, timing and contact on the day", "Tell us how the images will be used", "Plan a short buffer before the session starts"] },
];
export function serviceStyle(serviceName = "") { return SERVICE_STYLES.find((s) => s.match.test(serviceName)) || SERVICE_STYLES[SERVICE_STYLES.length - 1]; }

export type AutomationKey = "booking_received" | "payment_received" | "booking_cancelled" | "booking_rescheduled" | "booking_reminder" | "files_delivered" | "account_welcome" | "password_reset" | "verify_code" | "wallet_topup";
export type AutomationTemplate = { key: AutomationKey; name: string; trigger: string; subject: string; blocks: any[] };

export function buildAutomationTemplates(input?: Partial<EmailBrand>, opts: { serviceName?: string; heroImage?: string } = {}): AutomationTemplate[] {
  const b: EmailBrand = { ...DEFAULT_BRAND, ...(input || {}) };
  const svc = serviceStyle(opts.serviceName);
  const img = (i: number) => opts.heroImage || (b.heroImages[i % Math.max(1, b.heroImages.length)] || b.workImages[0] || "");
  const wa = b.waNumber ? `https://wa.me/${b.waNumber.replace(/[^\d]/g, "")}` : b.contactUrl;
  const portal = `${b.site}/client`;
  const settings = (preheader: string) => ({ type: "settings", bodyBg: "#f3f1f6", cardBg: "#ffffff", font: "lato", headingFont: "playfair", accent: PURPLE, headingColor: INK, textColor: "#3d3648", radius: 12, width: 600, preheader });
  const hero = (i: number, eyebrow: string, title: string, subtitle = "", extra: any = {}) => ({ type: "hero", image: img(i), eyebrow, title, subtitle, btnText: "", btnHref: portal, overlay: "#0f0a1a", overlayOpacity: 0.58, height: 250, ...extra });
  const status = (label: string, color: string) => ({ type: "text", align: "center", size: 12, padY: 14, bg: "#faf8fd", html: `<span style="display:inline-block;padding:6px 14px;border-radius:999px;border:1.5px solid ${color};color:${color};font-weight:700;letter-spacing:1.5px;font-size:11px">${label}</span>` });
  const details = (rows: [string, string][]) => ({ type: "html", html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8f6fc;border-radius:12px;font-family:Lato,Arial,sans-serif">${rows.map(([k, v], i) => `<tr><td style="padding:12px 18px;font-size:13px;color:#7a7088;${i ? "border-top:1px solid #ece7f4;" : ""}width:42%">${k}</td><td style="padding:12px 18px;font-size:14px;color:#140D21;font-weight:700;${i ? "border-top:1px solid #ece7f4;" : ""}text-align:right">${v}</td></tr>`).join("")}</table>` });
  const bookingRows: [string, string][] = [["Reference", "{{booking_ref}}"], ["Service", "{{service_name}}"], ["Package", "{{package_name}}"], ["Date", "{{booking_date}}"], ["Time", "{{booking_time}} (UAE)"], ["Total", "{{total}}"]];
  const btn = (text: string, href: string, color?: string) => ({ type: "button", text, href, ...(color ? { btnColor: color } : {}) });
  const help = { type: "text", align: "center", size: 13, color: "#7a7088", html: `Questions? Just reply to this email or <a href="${wa}" style="color:${PURPLE};font-weight:700">message us on WhatsApp</a>.` };
  const sign = { type: "text", size: 14, color: "#5d5568", html: `Warm regards,\n<b>${b.name}</b>\n${b.tagline}` };
  const foot = [
    { type: "spacer", height: 8, bg: "#f8f7fb" },
    { type: "social", instagram: b.instagram, youtube: b.youtube, linkedin: b.linkedin, tiktok: b.tiktok, website: b.site, bg: "#f8f7fb" },
    { type: "footer", align: "center", bg: "#f8f7fb", color: "#9a92a8", text: `© ${b.name} · ${b.address || "Dubai, UAE"}\nThis is a service email about your account or booking.` },
  ];
  const tips = { type: "text", size: 14, bg: "#f6f3fb", padY: 18, html: "<b>Getting ready for your {{service_label}} session</b>\n✓ {{tip1}}\n✓ {{tip2}}\n✓ {{tip3}}\n✓ {{tip4}}" };

  return [
    { key: "booking_received", name: "Booking Received", trigger: "New booking submitted (awaiting payment)", subject: "Your date is on hold{{comma_name}} — {{booking_ref}}",
      blocks: [settings("Your booking request is in — here's what happens next."), hero(0, "BOOKING RECEIVED", "Thank you{{comma_name}}", "We've saved your date"), status("AWAITING PAYMENT", AMBER),
        { type: "text", size: 15, padY: 22, html: "Your booking request has been received. Your date is held for you — complete the payment to confirm it." }, details(bookingRows),
        btn("Complete payment", portal), tips, help, sign, ...foot] },
    { key: "payment_received", name: "Booking Confirmed", trigger: "Payment captured (card / PayPal / wallet) or marked paid", subject: "Confirmed ✓ See you on {{booking_date}}{{comma_name}}",
      blocks: [settings("Payment received — your booking is confirmed."), hero(1, "BOOKING CONFIRMED", "You're all set{{comma_name}}", "Payment received · see you soon"), status("CONFIRMED · PAID", GREEN),
        { type: "text", size: 15, padY: 22, html: "We've received your payment of <b>{{total}}</b> and your booking is confirmed. A receipt is available in your client portal." }, details(bookingRows),
        btn("View my booking", portal), tips, { type: "text", size: 13, color: "#7a7088", html: "Need to change something? You can request a reschedule from your portal. Free changes up to 72 hours before your session — see our <a href=\"" + b.site + "/terms\" style=\"color:" + PURPLE + "\">terms</a>." }, help, sign, ...foot] },
    { key: "booking_rescheduled", name: "Booking Rescheduled", trigger: "Reschedule request approved", subject: "New date confirmed — {{booking_ref}}",
      blocks: [settings("Your booking has moved to a new date."), hero(2, "RESCHEDULED", "Your new date\nis confirmed", "{{booking_date}} · {{booking_time}}"), status("RESCHEDULED", PURPLE),
        { type: "text", size: 15, padY: 22, html: "Hi{{name_sp}}, your session has been moved. Everything else stays the same." }, details(bookingRows), btn("View my booking", portal), help, sign, ...foot] },
    { key: "booking_reminder", name: "Session Reminder", trigger: "24 hours before the session", subject: "Tomorrow: your {{service_name}} session",
      blocks: [settings("A quick reminder and checklist for tomorrow."), hero(3, "SEE YOU TOMORROW", "Your session is\nalmost here", "{{booking_date}} · {{booking_time}}"),
        { type: "text", size: 15, padY: 22, html: "Hi{{name_sp}}, just a friendly reminder about your session tomorrow. Here's a quick checklist so everything goes smoothly." }, tips, details(bookingRows), btn("Get directions / message us", wa, "#25D366"), sign, ...foot] },
    { key: "booking_cancelled", name: "Booking Cancelled", trigger: "Booking cancelled (by client request or admin)", subject: "Your booking {{booking_ref}} has been cancelled",
      blocks: [settings("Your booking has been cancelled."), hero(0, "BOOKING CANCELLED", "We're sorry to\nsee this one go", "", { overlayOpacity: 0.7 }), status("CANCELLED", RED),
        { type: "text", size: 15, padY: 22, html: "Hi{{name_sp}}, your booking <b>{{booking_ref}}</b> for {{service_name}} on {{booking_date}} has been cancelled.\n\n{{reason}}\n\nAny refund due under our cancellation terms is added to your wallet or returned to your original payment method within 5–10 working days." },
        btn("Book a new date", `${b.site}/?page=booking`), help, sign, ...foot] },
    { key: "files_delivered", name: "Your Files Are Ready", trigger: "Final files delivered (Google Drive link)", subject: "📸 Your photos are ready{{comma_name}}!",
      blocks: [settings("Your photos and videos are ready to download."), hero(1, "DELIVERY DAY", "Your files are ready{{comma_name}}", "{{photos}} photos · {{videos}} videos", { height: 290 }),
        { type: "text", size: 15, padY: 22, align: "center", html: "It was a pleasure working with you. Your final {{service_name}} gallery is ready to download." },
        btn("Download your files", "{{link}}"), { type: "text", align: "center", size: 13, color: "#7a7088", html: "Link available until <b>{{expires}}</b> · Please keep a backup copy." },
        { type: "gallery", img1: b.workImages[0] || img(2), img2: b.workImages[1] || img(3), cap1: "", cap2: "" },
        { type: "text", align: "center", size: 14, html: "Loved the result? A short review means the world to us ⭐" }, btn("Leave a review", b.site), sign, ...foot] },
    { key: "account_welcome", name: "Welcome to Your Client Portal", trigger: "New client account created", subject: "Welcome{{comma_name}} — your client portal is ready",
      blocks: [settings("Your client account is ready."), hero(2, b.name.toUpperCase(), "Welcome{{comma_name}}", "Your client portal is ready"),
        { type: "text", size: 15, padY: 22, html: "Your account has been created. From your portal you can:" },
        { type: "text", size: 14, bg: "#f6f3fb", padY: 18, html: "📅 See and manage your bookings\n💳 Pay securely and download receipts\n📁 Download your final photos & videos\n👛 Use wallet credit and offers\n💬 Message us directly" },
        btn("Open my portal", portal), help, sign, ...foot] },
    { key: "password_reset", name: "Reset Your Password", trigger: "Password reset requested", subject: "Reset your password",
      blocks: [settings("Use this link to choose a new password."), { type: "spacer", height: 18 }, { type: "heading", text: "Reset your password", size: 26, align: "center" },
        { type: "text", size: 15, align: "center", html: "Hi{{name_sp}}, we received a request to reset the password for your client account. Click below to choose a new one." },
        btn("Choose a new password", "{{link}}"), { type: "text", size: 13, align: "center", color: "#7a7088", html: "This link expires in 1 hour. If you didn't ask for this, you can safely ignore this email — your password won't change." }, ...foot] },
    { key: "verify_code", name: "Verification Code", trigger: "Email verification while booking", subject: "Your verification code: {{code}}",
      blocks: [settings("Your one-time code."), { type: "spacer", height: 18 }, { type: "heading", text: "Your verification code", size: 24, align: "center" },
        { type: "html", html: `<div style="text-align:center;padding:8px 0 4px"><span style="display:inline-block;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#140D21;background:#f3eefc;border:1px dashed ${PURPLE};border-radius:12px;padding:16px 22px">{{code}}</span></div>` },
        { type: "text", size: 13, align: "center", color: "#7a7088", html: "Enter this code to continue your booking. It expires in 10 minutes. Never share this code with anyone." }, ...foot] },
    { key: "wallet_topup", name: "Wallet Credit Added", trigger: "Wallet top-up / refund / gift credit", subject: "AED {{amount}} added to your wallet",
      blocks: [settings("Credit added to your wallet."), hero(3, "WALLET", "AED {{amount}}\nadded", "New balance: AED {{balance}}", { height: 230 }),
        { type: "text", size: 15, padY: 22, align: "center", html: "Hi{{name_sp}}, your wallet has been credited. Use it to pay for any booking instantly at checkout." },
        btn("Book with my wallet", `${b.site}/?page=booking`), help, sign, ...foot] },
  ];
}
