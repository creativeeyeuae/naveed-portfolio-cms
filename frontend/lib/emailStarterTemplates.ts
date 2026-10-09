// Ready-made professional starting points for CMS > Email Designer. Picking one copies its
// blocks into a NEW template -- everything stays fully editable. Brand colours match the site.
// Images are left for Naveed to fill with his own work (Media Library URL) so no stock photos
// are ever sent by accident; image blocks with no URL simply don't render.

const DARK = "#170F28", PURPLE = "#8B5CF6", GOLD = "#C9A96E", INK = "#140D21";
const SITE = "https://bynaveedanjum.com";
const brandBand = (sub = "PHOTOGRAPHY · CINEMATOGRAPHY") => [
  { type: "logo", src: "", width: 150, align: "center", bg: DARK },
  { type: "heading", text: "NAVEED ANJUM", align: "center", color: "#ffffff", size: 22, font: "playfair", bg: DARK, padY: 26, bold: true },
  { type: "text", html: sub, align: "center", color: "#A892C6", size: 11, bg: DARK, padY: 0 },
  { type: "spacer", height: 22, bg: DARK },
];
const footer = [
  { type: "social", instagram: "https://instagram.com/", youtube: "", website: SITE, whatsapp: "" },
  { type: "footer", align: "center", text: "Naveed Anjum · Dubai, UAE\nYou're receiving this because you're a valued contact of Naveed Anjum." },
];

export type StarterTemplate = { key: string; name: string; subject: string; description: string; blocks: any[] };

export const EMAIL_STARTERS: StarterTemplate[] = [
  {
    key: "welcome", name: "Welcome / Introduction", subject: "Lovely to meet you, {{first_name}}",
    description: "Warm first email after meeting a new contact.",
    blocks: [
      { type: "settings", bodyBg: "#f4f1f9", cardBg: "#ffffff", font: "lato", headingFont: "playfair", accent: PURPLE, headingColor: INK, textColor: "#3a3245", radius: 12, preheader: "Thank you for connecting — here's a little about my work." },
      ...brandBand(),
      { type: "heading", text: "Hello {{first_name}},", size: 26 },
      { type: "text", html: "It was a pleasure connecting with you. I'm Naveed — a Dubai-based photographer and cinematographer with over 20 years of experience creating premium visuals for brands, events and people.\n\nWhenever you need images or films that feel as good as your brand looks, I'd love to help." },
      { type: "image", src: "", alt: "Recent work" },
      { type: "button", text: "View My Portfolio", href: SITE },
      { type: "divider" },
      ...footer,
    ],
  },
  {
    key: "newsletter", name: "Newsletter / Latest Work", subject: "New work from the studio",
    description: "Share recent projects with a short story each.",
    blocks: [
      { type: "settings", bodyBg: "#efeaf6", cardBg: "#ffffff", font: "lato", headingFont: "playfair", accent: PURPLE, radius: 10, preheader: "A few favourite projects from this month." },
      ...brandBand("STUDIO NEWS"),
      { type: "heading", text: "This month at the studio", align: "center", size: 28 },
      { type: "text", html: "Hi {{first_name}}, here are a few projects I'm proud of — from luxury real estate to corporate events across the UAE.", align: "center" },
      { type: "image", src: "", alt: "Project one" },
      { type: "heading", text: "Project title", size: 20 },
      { type: "text", html: "One or two lines about the client, the idea and the result." },
      { type: "button", text: "See the full project", href: SITE, align: "left" },
      { type: "divider" },
      { type: "image", src: "", alt: "Project two" },
      { type: "heading", text: "Another project", size: 20 },
      { type: "text", html: "A short description of the shoot and what made it special." },
      { type: "button", text: "Watch the film", href: SITE, align: "left" },
      { type: "spacer", height: 12 },
      ...footer,
    ],
  },
  {
    key: "offer", name: "Special Offer / Promotion", subject: "An exclusive offer for {{company}}",
    description: "Bold promotion with a clear call to action.",
    blocks: [
      { type: "settings", bodyBg: "#120b20", cardBg: "#1d1430", font: "montserrat", headingFont: "montserrat", accent: GOLD, headingColor: "#ffffff", textColor: "#d9d0ea", radius: 14, preheader: "A limited-time package, reserved for valued clients." },
      { type: "logo", src: "", width: 140, align: "center" },
      { type: "text", html: "LIMITED TIME", align: "center", color: GOLD, size: 12, bold: true, padY: 24 },
      { type: "heading", text: "20% off your next shoot", align: "center", size: 34, bold: true },
      { type: "text", html: "Book any photography or video package before the end of the month and receive 20% off — plus a complimentary edited highlight reel.", align: "center" },
      { type: "image", src: "", alt: "Offer" },
      { type: "button", text: "Claim the Offer", href: SITE, btnTextColor: INK, size: 15 },
      { type: "text", html: "Offer valid for new bookings only. Cannot be combined with other offers.", align: "center", size: 11, color: "#8f84a6" },
      { type: "divider", lineColor: "#33264d" },
      ...footer.map((b: any) => (b.type === "footer" ? { ...b, color: "#8f84a6" } : b)),
    ],
  },
  {
    key: "event", name: "Event Invitation", subject: "You're invited, {{first_name}}",
    description: "Invite contacts to an exhibition, launch or open studio.",
    blocks: [
      { type: "settings", bodyBg: "#f7f3ec", cardBg: "#ffffff", font: "raleway", headingFont: "cormorant", accent: DARK, headingColor: INK, textColor: "#4a4256", radius: 4, preheader: "Join us — details inside." },
      { type: "logo", src: "", width: 140, align: "center" },
      { type: "text", html: "YOU ARE INVITED", align: "center", color: GOLD, size: 12, bold: true, padY: 28 },
      { type: "heading", text: "Event name", align: "center", size: 36 },
      { type: "image", src: "", alt: "Event" },
      { type: "text", html: "<b>Date:</b> Thursday, 1 January · 7:00 PM\n<b>Venue:</b> Dubai, UAE", align: "center", size: 15 },
      { type: "text", html: "An evening of photography, film and conversation. I'd be honoured to have you there.", align: "center" },
      { type: "button", text: "RSVP Now", href: "mailto:?subject=RSVP", radius: 0 },
      { type: "divider" },
      ...footer,
    ],
  },
  {
    key: "thanks", name: "Thank You / After the Shoot", subject: "Thank you, {{first_name}} — your photos are ready",
    description: "Follow-up after a project, with delivery link and review ask.",
    blocks: [
      { type: "settings", bodyBg: "#f4f1f9", cardBg: "#ffffff", font: "helvetica", headingFont: "playfair", accent: PURPLE, radius: 12, preheader: "Your gallery is ready to download." },
      ...brandBand(),
      { type: "heading", text: "Thank you, {{first_name}}!", align: "center", size: 28 },
      { type: "text", html: "It was a real pleasure working with you and the {{company}} team. Your final gallery is ready — click below to view and download.", align: "center" },
      { type: "button", text: "Open Your Gallery", href: SITE },
      { type: "divider" },
      { type: "text", html: "If you enjoyed the experience, a short review would mean the world to me.", align: "center", size: 13 },
      { type: "button", text: "Leave a Review", href: SITE, btnColor: "#ffffff", btnTextColor: PURPLE },
      ...footer,
    ],
  },
  {
    key: "minimal", name: "Minimal Personal Letter", subject: "Quick note, {{first_name}}",
    description: "Clean, personal email that looks hand-written — great for follow-ups.",
    blocks: [
      { type: "settings", bodyBg: "#ffffff", cardBg: "#ffffff", font: "georgia", headingFont: "georgia", accent: INK, textColor: "#2b2533", radius: 0, width: 560 },
      { type: "text", html: "Hi {{first_name}},", size: 16, padY: 28 },
      { type: "text", html: "Write your message here — short and personal works best.\n\nBest regards,", size: 16 },
      { type: "text", html: "<b>Naveed Anjum</b>\nPhotographer & Cinematographer · Dubai\n<a href=\"" + SITE + "\">bynaveedanjum.com</a>", size: 14, color: "#5d5568" },
    ],
  },
];
