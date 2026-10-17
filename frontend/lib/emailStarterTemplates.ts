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
  // Real price tiers from Settings > Packages -- proposals fill their price table from these,
  // so prices never need typing by hand.
  packages?: { label: string; price: string; priceNote?: string; features?: string[] }[];
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

  // ── Proposals: one ready design per service, each with a top navigation bar
  // (Services · Packages & Prices · Portfolio · Book · WhatsApp) and a price table filled
  // automatically from Settings > Packages. Pick one, change the client name — send.
  const bookUrl = `${b.site}/?page=booking`, pkgUrl = `${b.site}/packages`;
  const esc = (s: string) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
  const nav = (svcUrl: string, accent: string, bg: string, fg: string) => ({
    type: "html",
    html: `<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};"><tr><td align="center" style="padding:12px 8px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;">${[["Services", svcUrl], ["Packages &amp; Prices", pkgUrl], ["Portfolio", b.workUrl], ["Book", bookUrl], ["WhatsApp", wa]].map(([t, h], i) => `<a href="${h}" style="color:${i === 3 ? accent : fg};text-decoration:none;font-weight:700;padding:0 9px;display:inline-block;line-height:24px;">${t}</a>`).join(`<span style="color:${fg};opacity:.35;">|</span>`)}</td></tr></table>`,
  });
  const tiers = (b.packages || []).filter((p) => p.label).slice(0, 3);
  // Editable as plain text in the designer (one line per package: Name | Price | features; ... | note).
  const priceTable = (accent: string, light2: string, svc: string) => {
    const lines = tiers.length
      ? tiers.map((p) => [p.label, p.price || "On request", (p.features || []).slice(0, 5).join("; "), p.priceNote || ""].join(" | ").replace(/\s\|\s$/, ""))
      : ["Essential | AED 0,000 | Half-day coverage; 40 edited photos", "Premium | AED 0,000 | Full-day coverage; 100+ edited photos; Highlight film", "Signature | AED 0,000 | Multi-day; Photo + video team; Same-day edits"];
    return { type: "packages", items: lines.join("\n"), btnColor: accent, tint: light2, href: bookUrl, btnText: "Choose" };
  };
  const priceTableHtmlUnused = (accent: string, light2: string, svc: string) => {
    if (!tiers.length) return { type: "html", html: `<table width="100%" cellpadding="14" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;"><tr style="background:${light2};"><td><b>${esc(svc)}</b></td><td align="right"><a href="${pkgUrl}" style="color:${accent};font-weight:700;">See packages &amp; prices →</a></td></tr></table>` };
    const w = Math.floor(100 / tiers.length);
    const cols = tiers.map((p, i) => {
      const hot = tiers.length > 1 && i === 1;
      const feats = (p.features || []).slice(0, 5).map((f) => `<div style="padding:4px 0;border-top:1px solid ${hot ? "rgba(255,255,255,.15)" : "#ece8f2"};">✓ ${esc(f)}</div>`).join("");
      return `<td width="${w}%" valign="top" style="padding:6px;"><div style="background:${hot ? accent : light2};color:${hot ? "#fff" : "#2a2433"};border-radius:10px;padding:16px 14px;text-align:center;font-family:Arial,sans-serif;">${hot ? `<div style="font-size:10px;letter-spacing:.12em;font-weight:700;opacity:.85;">MOST POPULAR</div>` : ""}<div style="font-size:15px;font-weight:800;margin:4px 0;">${esc(p.label)}</div><div style="font-size:22px;font-weight:800;margin:6px 0;">${esc(p.price || "On request")}</div>${p.priceNote ? `<div style="font-size:11px;opacity:.75;">${esc(p.priceNote)}</div>` : ""}<div style="font-size:12px;text-align:left;margin-top:10px;">${feats}</div><a href="${bookUrl}" style="display:inline-block;margin-top:12px;padding:8px 14px;border-radius:6px;background:${hot ? "#fff" : accent};color:${hot ? accent : "#fff"};font-size:12px;font-weight:700;text-decoration:none;">Choose</a></div></td>`;
    }).join("");
    return { type: "html", html: `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cols}</tr></table>` };
  };
  const PROPOSALS: { key: string; svc: string; slug: string; accent: string; navBg: string; navFg: string; tint: string; headingFont: string; font: string; title: string; intro: string; scope: string; img: number; dark?: boolean; pkgs?: string; terms?: string; slugUrl?: string }[] = [
    { key: "proposal-realestate", svc: "Real Estate & Interiors", slug: "real-estate-photographer-dubai", accent: "#B08D57", navBg: "#111111", navFg: "#e9e2d6", tint: "#f7f3ec", headingFont: "playfair", font: "lato", img: 0, title: "Spaces that sell\nthemselves", intro: "Here's my proposal for photographing and filming {{company}}'s properties — bright, true-to-life images and smooth walkthrough films that help listings move faster.", scope: "• Wide-angle interiors & exteriors, HDR-blended\n• Twilight / golden-hour exterior set\n• Cinematic walkthrough film + vertical Reel\n• Drone aerials (where permitted)\n• Delivery in 48–72 hours, MLS & portal-ready" },
    { key: "proposal-corporate", svc: "Corporate & Brand Film", slug: "commercial-photographer-dubai", accent: "#2563EB", navBg: "#0B1730", navFg: "#c9d6f2", tint: "#eef3fd", headingFont: "montserrat", font: "lato", img: 1, title: "Your brand story,\non film", intro: "Thank you for the brief. Below is how I'd bring {{company}}'s story to life — a polished brand film plus a library of stills your team can use all year.", scope: "• Pre-production: concept, script outline & shot list\n• 1 shoot day, director-led crew\n• 60–90s hero film + 3 social cut-downs\n• Executive portraits & team photography\n• Licensed music, colour grade & 2 revision rounds" },
    { key: "proposal-events", svc: "Events & Exhibitions", slug: "event-photographer-dubai", accent: "#E11D48", navBg: "#1a0b12", navFg: "#f3cbd5", tint: "#fdf0f3", headingFont: "montserrat", font: "lato", img: 2, title: "Every moment\ncaptured", intro: "Here's my proposal to cover {{company}}'s event — fast, discreet coverage with same-day highlights so you can post while the buzz is live.", scope: "• Full coverage: arrivals, keynotes, networking, branding\n• Same-day selects for social (within 3 hours)\n• 2–3 minute highlight film + vertical Reels\n• Booth / stand & product shots\n• Full gallery in 5 working days" },
    { key: "proposal-hospitality", svc: "Hotels, F&B & Hospitality", slug: "lifestyle-photographer-dubai", accent: "#0F766E", navBg: "#0b1f1d", navFg: "#c7e6e2", tint: "#eef8f6", headingFont: "playfair", font: "lato", img: 3, title: "Taste, stay,\nremember", intro: "Thank you for considering me for {{company}}. Here's a proposal for imagery that makes guests want to book a table — or a room — the moment they see it.", scope: "• Rooms, suites, lobby, spa & pool\n• Signature dishes & beverage styling\n• Lifestyle scenes with talent (optional)\n• Short-form Reels for Instagram & TikTok\n• Web-ready & print-ready files" },
    { key: "proposal-product", svc: "Product & E-commerce", slug: "product-photographer-dubai", accent: "#7C3AED", navBg: "#ffffff", navFg: "#3b2a5c", tint: "#f4f0fd", headingFont: "montserrat", font: "lato", img: 4, title: "Products that\nclick", intro: "Here's my proposal for {{company}}'s product content — clean, consistent e-commerce images plus lifestyle shots that sell the feeling, not just the item.", scope: "• White-background packshots (Amazon / Noon ready)\n• Styled lifestyle & flat-lay scenes\n• 360° spin or short product loops\n• Colour-accurate retouching\n• Consistent look across the whole range" },
    { key: "proposal-portrait", svc: "Portraits & Personal Branding", slug: "personal-branding-photographer-dubai", accent: "#C9A96E", navBg: "#140D21", navFg: "#e6dcc8", tint: "#faf6ee", headingFont: "playfair", font: "lato", img: 5, title: "Look like the\nleader you are", intro: "Here's my proposal for your portrait and personal branding session — confident, natural images for LinkedIn, press, your website and speaking profiles.", scope: "• Pre-shoot styling & location call\n• Studio or on-location session (2–3 looks)\n• Headshots, environmental & candid portraits\n• Professional retouching\n• Social-ready crops for every platform" },
    { key: "proposal-social", svc: "Social Media Management", slug: "packages", accent: "#DB2777", navBg: "#1f0a17", navFg: "#f6cfe2", tint: "#fdf0f6", headingFont: "montserrat", font: "lato", img: 6, title: "Content that keeps\nyou visible", intro: "Here's my monthly social media proposal for {{company}} — consistent, professionally shot posts and Reels, written captions and a clear content calendar, so your brand shows up every week without you having to think about it.",
      scope: "• Professionally shot and edited photos and Reels\n• Captions and hashtags written for your audience\n• Monthly content calendar planned with you\n• On-site business visits to create fresh content\n• Scheduling and publishing (Growth & Professional)\n• Monthly performance report (Professional)",
      pkgs: "Starter | AED 500 / month | 2 posts; 2 Reels; 5 edited photos; Captions & hashtags; Content calendar; 1 on-site visit\n*Growth | AED 1,000 / month | 6 posts; 4 Reels; 10 edited photos; Captions & hashtags; Scheduling & publishing; 2 on-site visits\nProfessional | AED 2,000 / month | 12 posts; 8 Reels; 20 edited photos; Scheduling & publishing; Monthly report; 4 on-site visits",
      terms: "Monthly fee paid in advance — work starts once payment is confirmed. Unused visits don't carry over. Ad budgets, permits, location fees and extra posts, Reels, visits or photography are quoted separately and confirmed before any work begins." },
  ];
  const proposalTemplates: StarterTemplate[] = PROPOSALS.map((p) => ({
    key: p.key, name: `Proposal · ${p.svc}`, subject: `{{first_name}}, your ${p.svc.split(" &")[0].toLowerCase()} proposal is ready`,
    description: `Ready-to-send ${p.svc} proposal: navigation bar, scope, prices pulled from Packages, one-click Book.`,
    blocks: [
      light({ accent: p.accent, headingFont: p.headingFont, font: p.font, preheader: `Your ${p.svc} proposal — scope, packages and how to book.` }),
      nav(`${b.site}/${p.slug}`, p.accent, p.navBg, p.navFg),
      hero(p.img, p.title, `${p.svc} proposal · Prepared for {{company}}`, "Book a date", bookUrl, { height: 280, overlay: p.navBg === "#ffffff" ? "#1d1430" : p.navBg, overlayOpacity: 0.6, titleFont: p.headingFont }),
      { type: "text", html: `Dear {{first_name}},\n\n${p.intro}`, size: 15, padY: 24 },
      { type: "heading", text: "What's included", size: 19, bold: true },
      { type: "text", html: p.scope, size: 14.5, bg: p.tint, padY: 18 },
      { type: "gallery", img1: workImg(p.img), img2: workImg(p.img + 1), cap1: "Recent work", cap2: p.svc, link1: b.workUrl, link2: b.workUrl },
      { type: "heading", text: "Packages & prices", size: 19, bold: true },
      p.pkgs ? { type: "packages", items: p.pkgs, btnColor: p.accent, tint: p.tint, href: bookUrl, btnText: "Choose" } : priceTable(p.accent, p.tint, p.svc),
      { type: "text", html: p.terms || "A 50% deposit secures your date · This proposal is valid for 14 days · Custom quote available for multi-day or recurring work.", size: 12.5, color: "#7d7290", align: "center" },
      { type: "button", text: "Accept & Book Your Date", href: bookUrl, btnColor: p.accent },
      { type: "button", text: "Questions? Chat on WhatsApp", href: wa, btnColor: "#25D366" },
      signature(),
      ...footerBlocks(),
    ],
  }));

  return [
    // ── First email to a company: who Naveed is + every service, one clear next step ──
    {
      key: "intro-all-services", name: "First Email · Meet Naveed (All Services)", subject: "Photography & film for {{company_or}} — from Naveed Anjum",
      description: "The first email to a new company — a short personal intro, all services at a glance, recent work and one easy next step.",
      blocks: [
        light({ accent: GOLD, headingFont: "playfair", preheader: "20+ years of photography, film and content for brands across the UAE." }),
        nav(`${b.site}/photography`, GOLD, INK, "#e6dcc8"),
        hero(0, "Visual stories that\nmake brands stand out", "Photography · Film · Social Media · Design", "See My Work", b.workUrl, { height: 330, overlay: INK, overlayOpacity: 0.55 }),
        { type: "text", html: "Hello{{name_sp}},", size: 16, padY: 26 },
        { type: "text", html: `I'm <b>${b.name}</b>, a Dubai-based photographer and filmmaker with over 20 years behind the camera. I help brands, developers, hotels and event teams look their best — with images and films that feel premium and actually get used.\n\nI came across {{company_or}} and thought there could be a great fit, so here's a quick look at what I do.`, size: 15 },
        { type: "heading", text: "Everything visual, under one roof", size: 21, bold: true, align: "center" },
        { type: "html", html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">${[
          [["📷", "Photography", "Corporate & headshots, real estate & interiors, product, food, fashion and lifestyle."], ["🎬", "Videography", "Brand films, commercials, property walkthroughs, interviews and aerial / drone footage."]],
          [["🎤", "Events & Exhibitions", "Conferences, launches and trade shows — with same-day highlights for social."], ["📱", "Social Media", "Monthly Reels, posts and content calendars — from AED 500 / month."]],
          [["🏨", "Hospitality & F&B", "Rooms, spa, signature dishes and lifestyle scenes that make guests book."], ["🎨", "Design & Content", "Campaign visuals, social creatives and graphics that match your brand."]],
        ].map((row) => `<tr>${row.map(([i, t, d]) => `<td width="50%" valign="top" style="padding:6px;"><div style="background:#faf6ee;border-radius:10px;padding:16px 14px;height:100%;"><div style="font-size:22px;line-height:1;">${i}</div><div style="font-size:15px;font-weight:700;color:#140D21;margin:8px 0 4px;">${t}</div><div style="font-size:12.5px;line-height:1.55;color:#5d5568;">${d}</div></div></td>`).join("")}</tr>`).join("")}</table>` },
        { type: "gallery", img1: workImg(0), img2: workImg(1), cap1: "Recent work", cap2: "Brand & events", link1: b.workUrl, link2: b.workUrl },
        { type: "html", html: `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;text-align:center;"><tr>${[["20+", "years experience"], ["UAE-wide", "on location"], ["48h", "fast delivery options"]].map(([n, l]) => `<td width="33%" style="padding:10px 4px;"><div style="font-size:24px;font-weight:800;color:#C9A96E;">${n}</div><div style="font-size:11.5px;color:#7d7290;text-transform:uppercase;letter-spacing:.08em;">${l}</div></td>`).join("")}</tr></table>` },
        { type: "text", html: "If you have a shoot, launch or campaign coming up — or just want fresh content for your channels — I'd be happy to send a tailored proposal. A quick reply with what you need is all it takes.", size: 15, align: "center" },
        { type: "button", text: "View Packages & Prices", href: `${b.site}/packages`, btnColor: GOLD },
        { type: "button", text: "Chat on WhatsApp", href: wa, btnColor: "#25D366" },
        signature(),
        ...footerBlocks(),
      ],
    },
    ...proposalTemplates,
    // ── Corporate (light) ───────────────────────────────────────────────────
    {
      key: "corporate", name: "Corporate Introduction", subject: "Premium visual content for {{company}}",
      description: "Hero header, services and portfolio — a polished first email to brands and agencies.",
      blocks: [
        light({ preheader: "Photography & film for brands across the UAE." }),
        hero(0, "Visuals that elevate\nyour brand", "Photography · Videography · Social Media & Graphics", "View Portfolio"),
        { type: "text", html: "Dear {{first_name}},", size: 16, padY: 26 },
        { type: "text", html: `I'm ${b.name}, a Dubai-based photographer and cinematographer with 20+ years of experience creating premium visual content for leading brands, developers and hospitality groups.\n\nI'd love to help {{company}} tell its story through images and film that look as good as your brand deserves.`, size: 15 },
        { type: "heading", text: "What I create for brands", size: 20, bold: true },
        { type: "text", html: "<b>Photography</b> — corporate & executive portraits, real estate & interiors, hospitality, product & food, fashion & lifestyle, events and conferences\n\n<b>Videography</b> — brand films, commercials, corporate videos, event highlights, property tours and aerial / drone footage\n\n<b>Social media & graphics</b> — Reels, TikTok & short-form content, social media creatives, campaign visuals and graphic design", size: 15 },
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
        { type: "text", html: "It was a pleasure meeting you. As promised, here's a little about what I do.\n\nFor more than 20 years I've been creating photography, video, social media content and graphics for brands, events and people — always with a premium, cinematic finish.", size: 15, padY: 24 },
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
      key: "booking", name: "Booking Confirmation", subject: "Your booking is confirmed — {{booking_ref}}",
      description: "Confirms date, time, location and next steps after the deposit.",
      blocks: [
        light({ preheader: "Your date is confirmed — all the details inside." }),
        hero(4, "You're booked!", "✓ Your date is confirmed", "", b.workUrl, { height: 260 }),
        { type: "text", html: "Hi {{first_name}}, thank you — your booking is confirmed. Here are the details:", size: 15, padY: 24 },
        { type: "html", html: `<table width="100%" cellpadding="12" cellspacing="0" style="border:1px solid #e6e1ee;border-radius:8px;font-size:14px;font-family:Arial,sans-serif;"><tr><td style="color:#8f84a6;">Booking</td><td align="right"><b>{{booking_ref}}</b></td></tr><tr><td style="color:#8f84a6;">Service</td><td align="right"><b>{{service_name}} — {{package_name}}</b></td></tr><tr><td style="color:#8f84a6;">Date</td><td align="right"><b>{{booking_date}}</b></td></tr><tr><td style="color:#8f84a6;">Time</td><td align="right"><b>{{booking_time}}</b></td></tr><tr><td style="color:#8f84a6;">Total</td><td align="right"><b>{{total}}</b></td></tr></table>` },
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
