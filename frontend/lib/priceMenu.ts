// CreativeBot guided price finder (live chat widget in app/HomeClient.tsx).
// Visitor taps: Service -> Type -> Duration/Option -> sees a starting price.
// To change a price or wording, edit ONLY this file and redeploy. All prices are AED
// starting rates; the visitor is always offered "Get an exact quote" afterwards.

export type PriceOption = {
  label: string;
  emoji?: string;
  price?: string;        // shown on the result card, e.g. "AED 1,200"
  includes?: string[];   // bullet points on the result card
  next?: PriceStep;      // another question instead of a price
};
export type PriceStep = { question: string; options: PriceOption[] };

const hours = (rates: [string, string, string[]][]): PriceStep => ({
  question: "How long do you need us?",
  options: rates.map(([label, price, includes]) => ({ label, price, includes })),
});

const EVENT_PHOTO = hours([
  ["1 hour", "AED 750", ["1 hour coverage", "Professionally edited images", "Online gallery delivery"]],
  ["2 hours", "AED 1,200", ["2 hours coverage", "Professionally edited images", "Online gallery delivery"]],
  ["Half day (4 hrs)", "AED 1,500", ["Up to 4 hours", "Professionally edited images", "High-res gallery · 5-day delivery"]],
  ["Full day (8 hrs)", "AED 2,800", ["Up to 8 hours", "Professionally edited images", "High-res gallery · 3-day delivery"]],
]);
const EVENT_VIDEO = hours([
  ["1 hour", "AED 1,000", ["1 hour filming", "Edited highlight video"]],
  ["2 hours", "AED 1,600", ["2 hours filming", "Edited highlight video"]],
  ["Half day (4 hrs)", "AED 2,500", ["Up to 4 hours filming", "Highlight film + social reel"]],
  ["Full day (8 hrs)", "AED 4,500", ["Up to 8 hours filming", "Highlight film + social reels"]],
]);
const EVENT_BOTH = hours([
  ["1 hour", "AED 1,600", ["Photographer + videographer", "Edited photos + highlight video"]],
  ["2 hours", "AED 2,500", ["Photographer + videographer", "Edited photos + highlight video"]],
  ["Half day (4 hrs)", "AED 3,600", ["Photo + video team, up to 4 hours", "Edited photos, highlight film + reel"]],
  ["Full day (8 hrs)", "AED 6,500", ["Photo + video team, up to 8 hours", "Edited photos, highlight film + reels"]],
]);

const AGENT_BRANDING: PriceStep = {
  question: "Real Estate Agent Personal Branding — pick a monthly plan:",
  options: [
    { label: "Essential · 1 visit/month", price: "AED 600 / month", includes: ["1 visit (2-hour shoot)", "10 edited photos · 2 reels", "4 graphic posts for social media", "Minimum 3 months"] },
    { label: "Pro · 2 visits/month ⭐", price: "AED 1,000 / month", includes: ["2 visits (2-hour shoots)", "20 edited photos · 4 reels", "8 graphic posts for social media", "Delivered weekly: 5 photos + 1 reel + 2 posts", "Minimum 3 months"] },
    { label: "Elite · 4 visits/month", price: "AED 1,800 / month", includes: ["4 visits (weekly 2-hour shoots)", "40 edited photos · 8 reels", "12 graphic posts for social media", "Free headshot refresh every quarter · priority booking", "Minimum 3 months"] },
  ],
};
const MONTHLY_CONTENT: PriceStep = {
  question: "Monthly content plans for brands — pick one:",
  options: [
    { label: "Starter · 1 shoot day", price: "AED 3,500 / month", includes: ["15 edited photos + 2 reels", "Content plan & shot list", "5-day delivery · minimum 3 months"] },
    { label: "Growth · 2 shoot days", price: "AED 6,500 / month", includes: ["30 edited photos + 4 reels", "Content plan & captions guide", "3-day delivery · minimum 3 months"] },
    { label: "Premium · 4 shoot days", price: "AED 11,000 / month", includes: ["50 photos + 8 reels + 1 brand film", "Creative direction · priority booking", "48-hour delivery · minimum 3 months"] },
  ],
};
const SIGNATURE_PACKAGES: PriceStep = {
  question: "Our signature packages — pick one:",
  options: [
    { label: "Essential · half day", price: "AED 1,500", includes: ["Half-day shoot (up to 4 hrs)", "20 edited images · hi-res gallery", "Commercial license · 5-day delivery"] },
    { label: "Premium · full day", price: "AED 3,500", includes: ["Full-day shoot (up to 8 hrs)", "40 edited images + 60–90s highlight video", "Commercial license · 3-day delivery"] },
    { label: "Signature · multi-day", price: "AED 7,500", includes: ["Multi-day production", "80+ images + full cinematic film", "Creative direction · 48-hour priority delivery"] },
  ],
};

export const PRICE_MENU: PriceStep = {
  question: "How can I help you? Please select one:",
  options: [
    {
      label: "Photography", emoji: "📸",
      next: {
        question: "What type of photography?",
        options: [
          { label: "Event", emoji: "🎉", next: EVENT_PHOTO },
          { label: "Product & E-commerce", emoji: "🛍", next: { question: "Pick an option:", options: [
            { label: "Per product (min. 10)", price: "AED 150 / product", includes: ["White background or lifestyle", "Edited, web-ready images"] },
            { label: "Half day · up to 25 items", price: "AED 1,800", includes: ["Up to 25 products", "Edited, web-ready images"] },
            { label: "Full day · up to 50 items", price: "AED 3,200", includes: ["Up to 50 products", "Edited, web-ready images"] },
          ] } },
          { label: "Real Estate", emoji: "🏡", next: { question: "What kind of property?", options: [
            { label: "Apartment · up to 2 bed", price: "AED 900", includes: ["HDR listing photos", "Edited, portal-ready images"] },
            { label: "Villa · 3–4 bed", price: "AED 1,600", includes: ["HDR listing photos", "Interior + exterior"] },
            { label: "Luxury villa", price: "AED 2,800", includes: ["Full luxury photo set", "Interior, exterior & lifestyle shots"] },
          ] } },
          { label: "Real Estate Agent Branding (monthly)", emoji: "🧑‍💼", next: AGENT_BRANDING },
          { label: "Corporate & Headshots", emoji: "👔", next: { question: "Pick an option:", options: [
            { label: "Headshots · per person (min. 3)", price: "AED 350 / person", includes: ["Professional retouched headshots", "On-site at your office"] },
            { label: "Team photos · half day", price: "AED 1,800", includes: ["Team & group photos", "Up to 4 hours"] },
            { label: "Office & brand · half day", price: "AED 1,800", includes: ["Office, workspace & brand photos", "Up to 4 hours"] },
          ] } },
          { label: "Interiors", emoji: "✨", next: { question: "Pick an option:", options: [
            { label: "Interior project · 25 images", price: "AED 2,000", includes: ["Magazine-style interior photos", "25 edited images"] },
          ] } },
          { label: "Food & Restaurants", emoji: "🍽", next: { question: "Pick an option:", options: [
            { label: "Half day · 20 dishes", price: "AED 1,800", includes: ["20 dishes", "Menu & delivery-app ready images"] },
            { label: "Full day · 40 dishes", price: "AED 3,200", includes: ["40 dishes + ambience shots", "Menu & delivery-app ready images"] },
          ] } },
          { label: "Monthly social media content", emoji: "📅", next: MONTHLY_CONTENT },
        ],
      },
    },
    {
      label: "Videography", emoji: "🎬",
      next: {
        question: "What type of video?",
        options: [
          { label: "Event", emoji: "🎉", next: EVENT_VIDEO },
          { label: "Product video / reel", emoji: "🛍", price: "AED 900", includes: ["Short product video or reel", "Edited for Instagram & TikTok"] },
          { label: "Real estate walkthrough", emoji: "🏡", price: "AED 1,200", includes: ["Cinematic walkthrough video", "Horizontal + vertical reel version"] },
          { label: "Company profile film", emoji: "🏢", price: "AED 5,500", includes: ["Scripted company film", "Interviews, office & team footage", "Professional edit, music & colour grade"] },
          { label: "Social reels", emoji: "📱", price: "AED 750 / reel", includes: ["Short-form reel, shot & edited", "Ready for Instagram, TikTok & YouTube Shorts"] },
          { label: "Monthly social media content", emoji: "📅", next: MONTHLY_CONTENT },
        ],
      },
    },
    {
      label: "Photography + Videography", emoji: "🎥",
      next: {
        question: "What do you need?",
        options: [
          { label: "Event", emoji: "🎉", next: EVENT_BOTH },
          { label: "Brand / campaign packages", emoji: "⭐", next: SIGNATURE_PACKAGES },
          { label: "Real Estate Agent Branding (monthly)", emoji: "🧑‍💼", next: AGENT_BRANDING },
          { label: "Monthly social media content", emoji: "📅", next: MONTHLY_CONTENT },
        ],
      },
    },
    {
      label: "Graphic Design", emoji: "🎨",
      next: {
        question: "What would you like designed?",
        options: [
          { label: "Social media posts · 10 designs", emoji: "📱", price: "AED 800", includes: ["10 branded post designs", "Your colours & logo", "Instagram, Facebook & LinkedIn sizes"] },
          { label: "Monthly design plan · 12 posts", emoji: "📅", price: "AED 1,200 / month", includes: ["12 branded posts every month", "Stories versions included", "Minimum 3 months"] },
          { label: "Logo & brand identity", emoji: "✒️", price: "AED 2,500", includes: ["Logo concepts + final files", "Colour palette & fonts", "Mini brand guide"] },
          { label: "Flyer / brochure / menu", emoji: "📄", price: "AED 400 / design", includes: ["Print & digital ready", "2 rounds of changes"] },
        ],
      },
    },
    {
      label: "Website", emoji: "🌐",
      next: {
        question: "What kind of website?",
        options: [
          { label: "Landing page (1 page)", emoji: "🚀", price: "AED 3,000", includes: ["1 high-converting page", "Mobile-friendly + WhatsApp button", "Basic SEO setup"] },
          { label: "Business website (up to 5 pages)", emoji: "🏢", price: "AED 6,000", includes: ["Up to 5 pages", "Contact form + WhatsApp chat", "SEO setup & Google Business link"] },
          { label: "Portfolio / real estate website with CMS", emoji: "🖼", price: "AED 9,000", includes: ["Edit everything yourself (CMS)", "Galleries, listings or projects", "Booking / enquiry forms"] },
          { label: "Online store (e-commerce)", emoji: "🛒", price: "AED 12,000", includes: ["Products, cart & online payment", "Order management", "Mobile-friendly"] },
          { label: "Website care · monthly", emoji: "🛠", price: "AED 500 / month", includes: ["Updates, backups & security", "Small content changes", "Monthly check-up"] },
        ],
      },
    },
  ],
};
