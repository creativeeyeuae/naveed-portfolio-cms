// Ready-made professional starting points for CMS > Email Designer. Picking one copies its
// blocks into a NEW template -- everything stays fully editable.
//
// buildEmailStarters(brand) fills every design with Naveed's REAL details from the website
// settings (social links, phone, email, WhatsApp, address) and his own hero / project photos,
// so a template is ready to send without hunting for links. Mostly light, corporate designs;
// only the Offer and Seasonal designs are dark on purpose.

export type EmailBrand = {
  name: string;
  tagline: string;
  site: string;
  workUrl: string;
  contactUrl: string;
  phone: string;
  email: string;
  waNumber: string;
  address: string;
  instagram: string;
  youtube: string;
  linkedin: string;
  tiktok: string;
  heroImages: string[];   // website hero slides first, then project covers
  workImages: string[];   // project cover images
};

export const DEFAULT_BRAND: EmailBrand = {
  name: "Naveed Anjum",
  tagline: "Photographer · Cinematographer · Dubai",
  site: "https://bynaveedanjum.com",
  workUrl: "https://bynaveedanjum.com/work",
  contactUrl: "https://bynaveedanjum.com/contact",
  phone: "+971 581 174 911",
  email: "info@bynaveedanjum.com",
  waNumber: "971581174911",
  address: "Downtown Dubai, UAE",
  instagram: "https://www.instagram.com/bynaveedanjum/",
  youtube: "https://www.youtube.com/@ByNaveedAnjum",
  linkedin: "https://linkedin.com/in/naveedanjumch",
  tiktok: "",
  heroImages: [],
  workImages: [],
};

const PURPLE = "#8B5CF6", GOLD = "#C9A96E", INK = "#140D21", NAVY = "#1B2238";

export type StarterTemplate = { key: string; name: string; subject: string; description: string; blocks: any[] };

export function buildEmailStarters(input?: Partial<EmailBrand>): StarterTemplate[] {
  const b: EmailBrand = { ...DEFAULT_BRAND, ...(input || {}) };
  const pick = (list: string[], i: number) => (list.length ? list[i % list.length] : "");
  const heroImg = (i: number) => pick(b.heroImages.length ? b.heroImages : b.workImages, i);
  const workImg = (i: number) => pick(b.workImages.length ? b.workImages : b.heroImages, i);
  const wa = b.waNumber ? `https://wa.me/${b.waNumber.replace(/[^\d]/g, "")}` : b.contactUrl;

  // ── Shared building pieces ────────────────────────────────────────────────
  const light = (extra: any = {}) => ({ type: "settings", bodyBg: "#f3f1f6", cardBg: "#ffffff", font: "lato", headingFont: "playfair", accent: PURPLE, headingColor: INK, textColor: "#3d3648", radius: 10, width: 600, ...extra });
  const hero = (i: number, title: string, subtitle = "", btnText = "", btnHref = b.workUrl, extra: any = {}) => ({
    type: "hero", image: heroImg(i), eyebrow: b.name.toUpperCase(), title, subtitle, btnText, btnHref, overlay: "#0f0a1a", overlayOpacity: 0.55, height: 320, ...extra,
  });
  const signature = (align = "left") => ({ type: "text", align, size: 14, color: "#5d5568", html: `Warm regards,\n<b>${b.name}</b>\n${b.tagline}` });
  const footerBlocks = (dark = false) => [
    { type: "spacer", height: 8, bg: dark ? undefined : "#f8f7fb" },
    { type: "social", instagram: b.instagram, youtube: b.youtube, linkedin: b.linkedin, tiktok: b.tiktok, website: b.site, bg: dark ? undefined : "#f8f7fb" },
    { type: "contact", phone: b.phone, email: b.email, website: b.site, address: b.address, size: 12, bg: dark ? undefined : "#f8f7fb", color: dark ? "#cfc6e0" : "#5d5568" },
    { type: "footer", align: "center", bg: dark ? undefined : "#f8f7fb", color: dark ? "#7d7290" : "#9a92a8", text: `© ${b.name} · Dubai, UAE\nYou're receiving this because you're a valued contact. Simply reply "unsubscribe" to stop receiving emails.` },
  ];
  const portfolioBtn = (text = "View Portfolio") => ({ type: "button", text, href: b.workUrl });

  return [
    // ── Corporate (light) ───────────────────────────────────────────────────
    {
      key: "corporate", name: "Corporate Introduction", subject: "Premium visual content for {{company}}",
      description: "Hero header, services and portfolio — a polished first email to brands and agencies.",
      blocks: [
        light({ preheader: "Photography & film for brands across the UAE." }),
        hero(0, "Visuals that elevate\nyour brand", "Photography & cinematography for brands across the UAE", "View Portfolio"),
        { type: "text", html: "Dear {{first_name}},", size: 16, padY: 26 },
        { type: "text", html: `I'm ${b.name}, a Dubai-based photographer and cinematographer with 20+ years of experience creating premium visual content for leading brands, developers and hospitality groups.\n\nI'd love to help {{company}} tell its story through images and film that look as good as your brand deserves.`, size: 15 },
        { type: "heading", text: "What I create for brands", size: 20, bold: true },
        { type: "text", html: "• Corporate & executive portraits\n• Brand films and social media content\n• Events, launches and conferences\n• Real estate, interiors and hospitality", size: 15 },
        { type: "gallery", img1: workImg(0), img2: workImg(1), cap1: "Recent work", cap2: "Brand campaign", link1: b.workUrl, link2: b.workUrl },
        portfolioBtn("Explore My Work"),
        { type: "text", html: "Would you be open to a short call next week?", size: 15, align: "center" },
        { type: "divider" },
        signature(),
        ...footerBlocks(),
      ],
    },
    {
      key: "welcome", name: "Welcome / Lovely to Meet You", subject: "Lovely to meet you, {{first_name}}",
      description: "Warm follow-up after meeting someone at an event or exhibition.",
      blocks: [
        light({ preheader: "Thank you for connecting — here's a little about my work." }),
        hero(1, "Lovely to meet you,\n{{first_name}}", "Thank you for connecting", "", b.workUrl, { height: 280 }),
        { type: "text", html: "It was a pleasure meeting you. As promised, here's a little about what I do.\n\nFor more than 20 years I've been creating photography and films for brands, events and people — always with a premium, cinematic finish.", size: 15, padY: 24 },
        { type: "gallery", img1: workImg(2), img2: workImg(3), link1: b.workUrl, link2: b.workUrl },
        portfolioBtn(),
        { type: "text", html: "Whenever you need visuals for {{company}}, I'm just a message away.", size: 15, align: "center" },
        signature("center"),
        ...footerBlocks(),
      ],
    },
    {
      key: "inquiry", name: "Enquiry Reply", subject: "Thank you for your enquiry, {{first_name}}",
      description: "Fast, warm first reply to a new enquiry — moves them to a call or WhatsApp.",
      blocks: [
        light({ preheader: "Thank you for reaching out — here's what happens next." }),
        hero(2, "Thank you for\nreaching out", "I'll get back to you within 24 hours", "", b.workUrl, { height: 260 }),
        { type: "text", html: "Hi {{first_name}},\n\nThank you for your enquiry — I'm excited to hear more about your project.\n\nTo prepare an accurate proposal, could you share:", size: 15, padY: 24 },
        { type: "text", html: "• Date(s) and location\n• Photo, video, or both\n• How the final images or film will be used", size: 15, bg: "#f6f3fb", padY: 18 },
        { type: "text", html: "Or let's have a quick 15-minute call — whatever is easiest for you.", size: 15 },
        { type: "button", text: "Chat on WhatsApp", href: wa, btnColor: "#25D366" },
        signature(),
        ...footerBlocks(),
      ],
    },
    {
      key: "proposal", name: "Quote / Proposal", subject: "Your proposal, {{first_name}}",
      description: "Clean pricing table with what's included and one clear action.",
      blocks: [
        light({ headingFont: "montserrat", accent: NAVY, preheader: "Your tailored proposal is ready." }),
        hero(3, "Your Proposal", "Prepared for {{company}}", "", b.workUrl, { height: 240, overlay: NAVY, overlayOpacity: 0.7, titleFont: "montserrat" }),
        { type: "text", html: "Dear {{first_name}},\n\nThank you for the details. Based on our conversation, here's what I recommend:", size: 15, padY: 24 },
        { type: "html", html: `<table width="100%" cellpadding="12" cellspacing="0" style="border-collapse:collapse;font-size:14px;font-family:Arial,sans-serif;"><tr style="background:#f3f1f6;"><td><b>Package</b></td><td align="right"><b>Premium Coverage</b></td></tr><tr><td>Coverage</td><td align="right">Full day (8 hours)</td></tr><tr style="background:#f3f1f6;"><td>Deliverables</td><td align="right">150+ edited photos · 2-min film</td></tr><tr><td>Delivery</td><td align="right">Within 10 working days</td></tr><tr style="background:${NAVY};color:#ffffff;"><td><b>Investment</b></td><td align="right"><b>AED 0,000</b></td></tr></table>` },
        { type: "text", html: "A 50% deposit secures your date. This proposal is valid for 14 days.", size: 13, color: "#7d7290" },
        { type: "button", text: "Accept & Book", href: b.contactUrl, radius: 2 },
        signature(),
        ...footerBlocks(),
      ],
    },
    {
      key: "booking", name: "Booking Confirmation", subject: "Confirmed: your shoot with {{first_name}}",
      description: "Confirms date, time, location and next steps after the deposit.",
      blocks: [
        light({ preheader: "Your date is confirmed — all the details inside." }),
        hero(4, "You're booked!", "✓ Your date is confirmed", "", b.workUrl, { height: 260 }),
        { type: "text", html: "Hi {{first_name}}, thank you — your booking is confirmed. Here are the details:", size: 15, padY: 24 },
        { type: "html", html: `<table width="100%" cellpadding="12" cellspacing="0" style="border:1px solid #e6e1ee;border-radius:8px;font-size:14px;font-family:Arial,sans-serif;"><tr><td style="color:#8f84a6;">Date</td><td align="right"><b>Day, 00 Month 2026</b></td></tr><tr><td style="color:#8f84a6;">Time</td><td align="right"><b>10:00 AM</b></td></tr><tr><td style="color:#8f84a6;">Location</td><td align="right"><b>Venue, Dubai</b></td></tr><tr><td style="color:#8f84a6;">Package</td><td align="right"><b>Package name</b></td></tr></table>` },
        { type: "text", html: "I'll send a short preparation guide a few days before the shoot. If anything changes, just reply to this email.", size: 15 },
        { type: "button", text: "Message me on WhatsApp", href: wa, btnColor: "#25D366" },
        signature(),
        ...footerBlocks(),
      ],
    },
    {
      key: "preshoot", name: "Pre-Shoot Guide", subject: "Getting ready for your shoot, {{first_name}}",
      description: "Prep tips sent 2–3 days before — fewer surprises, better results.",
      blocks: [
        light({ bodyBg: "#f5f2ec", headingFont: "cormorant", preheader: "A few simple tips to get the best results." }),
        hero(5, "Your shoot is\nalmost here", "A few simple tips for the best results", "", b.workUrl, { height: 280 }),
        { type: "heading", text: "1 · What to wear", size: 22, padY: 22 },
        { type: "text", html: "Solid colours and timeless pieces photograph best. Avoid large logos and busy patterns.", size: 15 },
        { type: "heading", text: "2 · Timing", size: 22 },
        { type: "text", html: "In Dubai, the most beautiful natural light is the first hour after sunrise and the hour before sunset.", size: 15 },
        { type: "heading", text: "3 · On the day", size: 22 },
        { type: "text", html: "Please arrive 10 minutes early and arrange any permits or venue access in advance.", size: 15 },
        { type: "button", text: "Questions? Message me", href: wa, radius: 0 },
        ...footerBlocks(),
      ],
    },
    {
      key: "delivery", name: "Gallery Delivery / Thank You", subject: "Your images are ready, {{first_name}}",
      description: "Deliver the final gallery and thank the client.",
      blocks: [
        light({ preheader: "Your final gallery is ready to view and download." }),
        hero(6, "Your gallery\nis ready", "Thank you for trusting me with your project", "Open Your Gallery", b.site),
        { type: "text", html: "Hi {{first_name}},\n\nIt was a real pleasure working with you and the {{company}} team. Your final images are ready — click the button above to view and download them in full resolution.", size: 15, padY: 24 },
        { type: "gallery", img1: workImg(4), img2: workImg(5) },
        { type: "text", html: "If you enjoyed the experience, a short review would mean the world to me.", size: 14, align: "center" },
        { type: "button", text: "Leave a Review", href: b.site, btnColor: "#ffffff", btnTextColor: PURPLE },
        signature("center"),
        ...footerBlocks(),
      ],
    },
    {
      key: "review", name: "Review Request", subject: "Could you spare 1 minute, {{first_name}}?",
      description: "Ask happy clients for a Google review a week after delivery.",
      blocks: [
        light({ preheader: "Your words help other clients find me." }),
        hero(7, "How did we do?", "★★★★★", "", b.workUrl, { height: 240 }),
        { type: "text", html: "Hi {{first_name}}, it was a real pleasure working with you. If you're happy with the results, a short Google review would mean a lot — it takes less than a minute and helps others discover my work.", align: "center", size: 15, padY: 26 },
        { type: "button", text: "Leave a Google Review", href: "https://g.page/r/" },
        { type: "text", html: "Thank you for trusting me with your project.", align: "center", size: 13, color: "#8f84a6" },
        ...footerBlocks(),
      ],
    },
    {
      key: "newsletter", name: "Newsletter / Latest Work", subject: "New from the studio, {{first_name}}",
      description: "Share recent projects with photos and a short story each.",
      blocks: [
        light({ preheader: "A few favourite projects from this month." }),
        hero(0, "This month\nat the studio", "Recent projects from across the UAE", "See All Work"),
        { type: "text", html: "Hi {{first_name}}, here are a few projects I'm proud of — from luxury real estate to corporate events.", size: 15, align: "center", padY: 24 },
        { type: "image", src: workImg(0), alt: "Project one", link: b.workUrl },
        { type: "heading", text: "Project title", size: 20, bold: true },
        { type: "text", html: "One or two lines about the client, the idea and the result.", size: 15 },
        { type: "button", text: "See the project", href: b.workUrl, align: "left" },
        { type: "divider" },
        { type: "gallery", img1: workImg(1), img2: workImg(2), cap1: "Project two", cap2: "Project three", link1: b.workUrl, link2: b.workUrl },
        portfolioBtn("Explore the Full Portfolio"),
        ...footerBlocks(),
      ],
    },
    {
      key: "reengage", name: "Check-in / Re-engagement", subject: "It's been a while, {{first_name}}",
      description: "Reconnect with past clients — great for repeat corporate work.",
      blocks: [
        light({ preheader: "New work and a few ideas for {{company}}." }),
        hero(1, "Hope all is well\nat {{company}}", "", "", b.workUrl, { height: 260 }),
        { type: "text", html: "Hi {{first_name}},\n\nIt's been a while since we worked together and I wanted to check in. I've recently completed some exciting projects — brand films, executive portraits and event coverage — that might be useful for your upcoming plans.", size: 15, padY: 24 },
        { type: "gallery", img1: workImg(3), img2: workImg(4), link1: b.workUrl, link2: b.workUrl },
        portfolioBtn("See Recent Work"),
        { type: "text", html: "If anything is coming up this quarter, I'd love to help — just reply to this email.", size: 14 },
        signature(),
        ...footerBlocks(),
      ],
    },
    {
      key: "event", name: "Event Invitation", subject: "You're invited, {{first_name}}",
      description: "Invite contacts to an exhibition, launch or open studio.",
      blocks: [
        light({ bodyBg: "#f5f2ec", headingFont: "cormorant", accent: INK, preheader: "Join us — details inside." }),
        hero(2, "You're Invited", "An evening of photography, film & conversation", "RSVP Now", `mailto:${b.email}?subject=RSVP`, { height: 340, titleFont: "cormorant", size: 44 }),
        { type: "html", html: `<table width="100%" cellpadding="12" cellspacing="0" style="font-size:15px;font-family:Arial,sans-serif;text-align:center;"><tr><td><b>Date</b><br>Thursday, 1 January</td><td><b>Time</b><br>7:00 PM</td><td><b>Venue</b><br>Dubai, UAE</td></tr></table>` },
        { type: "text", html: "Dear {{first_name}}, I'd be honoured to have you there. Please let me know if you can join.", size: 15, align: "center" },
        ...footerBlocks(),
      ],
    },
    {
      key: "payment", name: "Payment Reminder", subject: "Friendly reminder: invoice for {{company}}",
      description: "Polite, professional balance reminder — letter style.",
      blocks: [
        light({ bodyBg: "#ffffff", font: "helvetica", headingFont: "helvetica", radius: 0, width: 560 }),
        { type: "text", html: `<b>${b.name.toUpperCase()}</b>`, size: 13, color: INK, padY: 24 },
        { type: "divider" },
        { type: "text", html: "Hi {{first_name}},", size: 15, padY: 18 },
        { type: "text", html: "I hope you're well and enjoying the final images. This is a friendly reminder that the balance for invoice <b>#0000</b> (<b>AED 0,000</b>) is due on <b>00 Month</b>.\n\nIf you've already sent it, thank you — please ignore this message.", size: 15 },
        { type: "button", text: "View Invoice", href: b.site, align: "left" },
        signature(),
        { type: "contact", phone: b.phone, email: b.email, website: b.site, align: "left", size: 12, color: "#7d7290" },
      ],
    },
    {
      key: "minimal", name: "Minimal Personal Letter", subject: "Quick note, {{first_name}}",
      description: "Clean, personal email that looks hand-written — great for follow-ups.",
      blocks: [
        light({ bodyBg: "#ffffff", font: "georgia", headingFont: "georgia", radius: 0, width: 560, textColor: "#2b2533" }),
        { type: "text", html: "Hi {{first_name}},", size: 16, padY: 28 },
        { type: "text", html: "Write your message here — short and personal works best.\n\nBest regards,", size: 16 },
        { type: "text", html: `<b>${b.name}</b>\n${b.tagline}\n<a href="${b.site}">${b.site.replace(/^https?:\/\//, "")}</a> · ${b.phone}`, size: 14, color: "#5d5568" },
      ],
    },

    // ── Dark designs (used deliberately) ────────────────────────────────────
    {
      key: "offer", name: "Special Offer (dark)", subject: "An exclusive offer for {{company}}",
      description: "Bold dark-and-gold promotion with a clear call to action.",
      blocks: [
        { type: "settings", bodyBg: "#120b20", cardBg: "#1d1430", font: "montserrat", headingFont: "montserrat", accent: GOLD, headingColor: "#ffffff", textColor: "#d9d0ea", radius: 14 , preheader: "A limited-time package, reserved for valued clients." },
        hero(3, "20% off\nyour next shoot", "Limited time · for valued clients", "Claim the Offer", b.contactUrl, { overlayOpacity: 0.6, btnTextColor: INK }),
        { type: "text", html: "Book any photography or video package before the end of the month and receive 20% off — plus a complimentary edited highlight reel.", align: "center", size: 15, padY: 26 },
        { type: "text", html: "Offer valid for new bookings only. Cannot be combined with other offers.", align: "center", size: 11, color: "#8f84a6" },
        ...footerBlocks(true),
      ],
    },
    {
      key: "seasonal", name: "Seasonal Greetings (dark)", subject: "Warm wishes from " + DEFAULT_BRAND.name,
      description: "Elegant card for Eid, UAE National Day or New Year — change the title.",
      blocks: [
        { type: "settings", bodyBg: "#0f0a1a", cardBg: "#1a1228", font: "lato", headingFont: "cormorant", accent: GOLD, headingColor: GOLD, textColor: "#e6dff2", radius: 16, preheader: "Wishing you and your loved ones a joyful season." },
        hero(4, "Eid Mubarak", "✦ ✦ ✦", "", b.workUrl, { titleFont: "cormorant", size: 48, color: GOLD, overlayOpacity: 0.6 }),
        { type: "text", html: "Dear {{first_name}},\n\nWishing you and your family peace, happiness and prosperity. Thank you for being part of my journey this year.", align: "center", size: 16, padY: 26 },
        { type: "text", html: `With warm wishes,\n<b>${b.name}</b>`, align: "center", color: GOLD, size: 15 },
        ...footerBlocks(true),
      ],
    },
  ];
}

// Backwards-compatible default list (used where no website settings are available).
export const EMAIL_STARTERS: StarterTemplate[] = buildEmailStarters();
