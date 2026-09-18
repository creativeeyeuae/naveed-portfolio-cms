// Build-time reader for the REAL portfolio/journal content the admin already manages
// via CMS > Portfolio / CMS > Journal in app/page.tsx. That CMS saves to Supabase's
// site_settings table (key/value JSON rows, keys "nap_projects" / "nap_blog") -- the
// exact same table/pattern the live homepage's "Featured Work" section reads from
// client-side. This file is the server-side (build-time) equivalent, used by
// generateStaticParams/generateMetadata in app/work/[slug] and app/journal/[slug],
// and by sitemap.ts -- replacing the old lib/api.ts calls to a legacy Workers backend
// that was never actually deployed (confirmed: `wrangler deployments list` reports
// that Worker does not exist on the account), which is why those pages built empty.
//
// Real data only: whatever is actually saved in site_settings right now. No invented
// projects/posts, no fake fallback content -- an empty or unreachable table returns []
// exactly like the safe-fallback pattern this replaces.
export type CmsProjectImage = { url: string; orientation?: string; altText?: string };

export type CmsProject = {
  id: string;
  title: string;
  slug: string;
  categories?: string[];
  description?: string;
  fullDescription?: string;
  clientName?: string;
  location?: string;
  projectDate?: string;
  featured?: boolean;
  coverImage?: string;
  youtubeUrl?: string;
  images?: CmsProjectImage[];
  reels?: string[];
  // Additive fields for the canonical /work/[slug] page -- see app/page.tsx's Project type
  // for the full rationale. All optional; every field falls back to an existing one when unset.
  projectName?: string;
  bannerTitle?: string;
  bannerImage?: string;
  // Every slug this project has ever had (oldest first), tracked automatically by the CMS's
  // saveProj() whenever the title/slug changes -- see app/page.tsx's Project type for the
  // full rationale. app/work/[slug]/page.tsx uses this to soft-redirect an old shared link
  // to the project's current slug instead of 404ing.
  previousSlugs?: string[];
};

export type CmsBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  date?: string;
  category?: string;
  coverImage?: string;
  content?: string;
};

// Plain REST fetch (same anon-key PostgREST call the CMS itself uses). Deliberately does
// NOT pass `cache: "no-store"`: this route tree is statically exported (output: "export"),
// and a fetch with cache:"no-store" (or any explicit revalidate) makes Next.js treat the
// page as needing dynamic rendering, which conflicts with static export and throws
// "couldn't be rendered statically because it used revalidate: 0 fetch ...". That throw
// was being silently swallowed by the catch below, surfacing as "no matching post/project"
// -> notFound() on a route already committed to in generateStaticParams -> a broken static
// export for that page (Next's generic client-only error shell instead of real content,
// without failing the overall build). Plain fetch (Next's default, static-safe caching)
// is correct here anyway: every `next build` is a fresh process, so there is no stale
// cross-build response to worry about -- each build always performs a real network call.
//
// Also memoized per build-process: generateStaticParams, generateMetadata and the page
// component each call this independently for the same key; one shared promise avoids
// firing that many separate requests for the same row.
const siteSettingsCache = new Map<string, Promise<any[]>>();

// Next's static export build renders /work/[slug] and /journal/[slug] pages across several
// worker processes in parallel, each with its OWN fresh module scope -- so the in-memory
// promise cache above only dedupes calls *within* one worker, not across all of them. Each
// worker independently fetches this same Supabase row. That's normally harmless (same query,
// same answer) EXCEPT a single transient network hiccup (a dropped connection, a brief rate
// limit, a slow DNS lookup) in just ONE worker used to be swallowed by a bare `catch { return
// [] }` -- silently treating "the real project list" as "there are no projects" for whichever
// one route happened to render in that unlucky worker, which then baked a real 404 into that
// route's static HTML even though the project genuinely exists (confirmed live case: WIC 2025
// intermittently 404'd while the other two real projects on the same build succeeded).
//
// The retry loop below closed part of that window but not all of it: 3 attempts over ~1.2s of
// backoff is thin for a real hiccup, and -- the actual bug -- once every attempt was exhausted
// this used to swallow the failure into a silent `[]`, letting `next build` finish "successfully"
// and get deployed with real project pages quietly missing (WIC 2025 404'd again after this same
// retry logic was already live, exactly because of this). A build-time data fetch failing should
// stop the build, not ship a broken site: readSiteSettingsKey now throws once retries are
// exhausted, so `next build` fails loudly and nothing broken ever reaches `wrangler pages deploy`.
// The empty-table / missing-env-var case is unchanged and still resolves to [] on purpose (that's
// a real "no projects yet" state, not a fetch failure).
async function fetchWithRetry(url: string, init: RequestInit, attempts = 6): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }
  throw new Error(`cmsData: fetch failed after ${attempts} attempts for ${url}: ${lastErr}`);
}

async function readSiteSettingsKey<T>(key: string): Promise<T[]> {
  if (siteSettingsCache.has(key)) return siteSettingsCache.get(key)!;
  const promise = (async (): Promise<T[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return [];
    const res = await fetchWithRetry(
      `${url}/rest/v1/site_settings?select=value&key=eq.${encodeURIComponent(key)}`,
      { headers: { apikey: anonKey } }
    );
    const rows = (await res.json()) as { value?: string }[];
    const value = rows?.[0]?.value;
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  })();
  siteSettingsCache.set(key, promise);
  return promise;
}

export function getRealProjects(): Promise<CmsProject[]> {
  return readSiteSettingsKey<CmsProject>("nap_projects");
}

export function getRealBlogPosts(): Promise<CmsBlogPost[]> {
  return readSiteSettingsKey<CmsBlogPost>("nap_blog");
}

// The general CMS settings row ("nap_settings") is stored as a single JSON OBJECT, not an
// array -- readSiteSettingsKey above only returns rows that parse as an array, so it can't
// be reused here. Currently only used to read the "Image Permission Requests: ON/OFF" CMS
// switch for /work/[slug]; defaults to enabled (matching the live CMS's own default) if the
// row is missing/unreachable, so a misconfigured/offline settings row never silently hides
// a feature that was never actually turned off.
let siteSettingsObjectCache: Promise<Record<string, unknown>> | null = null;
async function readSiteSettingsObject(): Promise<Record<string, unknown>> {
  if (siteSettingsObjectCache) return siteSettingsObjectCache;
  siteSettingsObjectCache = (async (): Promise<Record<string, unknown>> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return {};
    try {
      const res = await fetchWithRetry(
        `${url}/rest/v1/site_settings?select=value&key=eq.nap_settings`,
        { headers: { apikey: anonKey } }
      );
      if (!res) return {};
      const rows = (await res.json()) as { value?: string }[];
      const value = rows?.[0]?.value;
      if (!value) return {};
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  })();
  return siteSettingsObjectCache;
}

export async function getImagePermissionEnabled(): Promise<boolean> {
  const settings = await readSiteSettingsObject();
  return settings.imagePermissionEnabled !== false;
}

// Per-item photo overrides for the /gear page, uploaded via CMS > Settings > Gear Photos
// (app/page.tsx, settingsTab==="gear"). Keyed by the gear item's exact name so the page can
// do `gearImages[item.name] || item.defaultImg`. Missing/malformed data (nothing uploaded
// yet, or an old settings row from before this field existed) safely returns {}.
export async function getGearImages(): Promise<Record<string, string>> {
  const settings = await readSiteSettingsObject();
  const raw = settings.gearImages;
  if (!Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const entry of raw as { name?: unknown; img?: unknown }[]) {
    if (entry && typeof entry.name === "string" && typeof entry.img === "string" && entry.img) {
      out[entry.name] = entry.img;
    }
  }
  return out;
}

export type PublicSiteInfo = {
  siteName: string;
  siteTagline: string;
  phone: string;
  email: string;
  location: string;
  instagram: string;
  youtube: string;
  linkedin: string;
  footerCopyright: string;
  // Additive fields below -- needed to faithfully mirror app/page.tsx's own <Nav>/<Footer>
  // on /work/[slug] (see components/work/SiteHeader.tsx / SiteFooter.tsx). Nothing above this
  // line changed; every existing caller keeps working unmodified.
  address: string;
  waNumber: string;
  waMsg: string;
  tiktok: string;
  pageEnabled: Record<string, boolean>;
  footerLinks: { label: string; page: string }[];
  services: { id: string; title: string }[];
  navBookBtn: string;
  footerWhatsappBtn: string;
  // Additive fields for the standalone /about and /contact pages -- sourced from the same
  // DEF_SETTINGS fields the homepage SPA's own About/Contact page-views already render
  // (app/page.tsx, page==="about" / page==="contact"). Nothing above this line changed.
  aboutName: string;
  aboutTitle: string;
  aboutBio: string;
  aboutPhoto: string;
  statsYears: string;
  statsProjects: string;
  statsClients: string;
  aboutBannerEyebrow: string;
  aboutBannerTitle: string;
  contactBannerEyebrow: string;
  contactBannerTitle: string;
  // Additive fields for the standalone /work index page -- same rationale as the About/
  // Contact banner fields above, sourced from the same uiText.workBannerEyebrow/workBannerTitle
  // the homepage SPA's own all-projects Work view already reads (app/page.tsx, page==="work").
  workBannerEyebrow: string;
  workBannerTitle: string;
  // Additive fields for the standalone /packages page -- same rationale as the Work banner
  // fields above (sourced from uiText.packagesBannerEyebrow/Title, already real CMS fields
  // the homepage SPA's own in-memory Packages view already reads). pricingPackages mirrors
  // settings.pricingPackages (Settings > Packages) and packagesServices mirrors the richer
  // settings.services shape (icon/desc/deliverables) the SPA's Packages view uses -- kept as
  // separate fields from the existing `services` above (title-only) so no existing caller of
  // that field changes shape.
  packagesBannerEyebrow: string;
  packagesBannerTitle: string;
  pricingPackages: CmsPricingPackage[];
  packagesServices: CmsServiceDetail[];
};

export type CmsPricingPackage = {
  id: string;
  icon?: string;
  label: string;
  price: string;
  priceNote?: string;
  desc?: string;
  image?: string;
  ctaLabel?: string;
  features?: string[];
};

export type CmsServiceDetail = {
  id: string;
  icon?: string;
  title: string;
  desc?: string;
  deliverables?: string[];
};

// Same defaults as DEF_SETTINGS in app/page.tsx (the CMS's own fallback values) -- used so
// /work/[slug]'s header/footer show real branding even before the CMS settings row exists,
// exactly like the homepage does today.
const DEFAULT_PUBLIC_SITE_INFO: PublicSiteInfo = {
  siteName: "Naveed Anjum",
  siteTagline: "Photography & Cinematography",
  phone: "+971 581 174 911",
  email: "creativeeyeuae@gmail.com",
  location: "Dubai, UAE",
  instagram: "https://www.instagram.com/bynaveedanjum/",
  youtube: "https://youtube.com/@creativeeyeuae",
  linkedin: "https://linkedin.com/in/naveedanjumch",
  footerCopyright: "© 2026 Naveed Anjum · Creative Fusion · Dubai, UAE",
  // Same defaults as DEF_SETTINGS in app/page.tsx for these additive fields too.
  address: "Downtown Dubai, UAE",
  waNumber: "971581174911",
  waMsg: "Hello Naveed, I visited your portfolio and would like to discuss a project.",
  tiktok: "",
  pageEnabled: { work: true, about: true, packages: true, blog: true, cv: true, booking: true, contact: true },
  footerLinks: [
    { label: "Work", page: "work" },
    { label: "About", page: "about" },
    { label: "Packages", page: "packages" },
    { label: "CV", page: "cv" },
    { label: "Booking", page: "booking" },
    { label: "Contact", page: "contact" },
  ],
  services: [
    { id: "s1", title: "Photography" },
    { id: "s2", title: "Videography" },
    { id: "s3", title: "Content Creation" },
    { id: "s4", title: "Creative Production" },
  ],
  navBookBtn: "Book a Project",
  footerWhatsappBtn: "WhatsApp Us",
  // Same defaults as DEF_SETTINGS/uiText in app/page.tsx for the About/Contact fields.
  aboutName: "Naveed Anjum",
  aboutTitle: "Photographer · Cinematographer · Creative Director",
  aboutBio:
    "A Dubai-based photographer and cinematographer with over 20 years of experience -- including 10 years based in the UAE -- crafting luxury visual content for high-end clients. Founder of Creative Fusion, specializing in interior, real estate, product, lifestyle and campaign photography, plus short-form video content for Instagram and TikTok, with a refined eye for composition and brand-consistent visual storytelling across luxury residential and hospitality spaces.",
  aboutPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  statsYears: "20+",
  statsProjects: "500+",
  statsClients: "200+",
  aboutBannerEyebrow: "About",
  aboutBannerTitle: "About",
  contactBannerEyebrow: "Get In Touch",
  contactBannerTitle: "Let's Work Together",
  workBannerEyebrow: "Portfolio",
  workBannerTitle: "Selected Work",
  packagesBannerEyebrow: "Packages",
  packagesBannerTitle: "Your Investment",
  pricingPackages: [],
  packagesServices: [
    { id: "s1", title: "Photography" },
    { id: "s2", title: "Videography" },
    { id: "s3", title: "Content Creation" },
    { id: "s4", title: "Creative Production" },
  ],
};

// Read-only subset of the CMS's "nap_settings" row needed to render a real site header/
// footer (site name, contact info, social links) on /work/[slug] -- the same source the
// homepage's own <Nav>/<Footer> read from, so branding stays in sync with the CMS without
// duplicating the full SiteSettings shape here.
type StringInfoKey =
  | "siteName" | "siteTagline" | "phone" | "email" | "location"
  | "instagram" | "youtube" | "linkedin" | "footerCopyright"
  | "address" | "waNumber" | "waMsg" | "tiktok"
  | "aboutName" | "aboutTitle" | "aboutBio" | "aboutPhoto"
  | "statsYears" | "statsProjects" | "statsClients";

export async function getPublicSiteInfo(): Promise<PublicSiteInfo> {
  const settings = await readSiteSettingsObject();
  const pick = (key: StringInfoKey): string => {
    const v = settings[key];
    return typeof v === "string" && v ? v : DEFAULT_PUBLIC_SITE_INFO[key];
  };

  // uiText / pageEnabled / footerLinks / services are nested/typed objects in the real
  // SiteSettings shape (see app/page.tsx) -- read them defensively since this is parsed
  // straight from a JSON column, and fall back to the same defaults per-field.
  const uiTextRaw = settings.uiText;
  const uiText = uiTextRaw && typeof uiTextRaw === "object" && !Array.isArray(uiTextRaw) ? (uiTextRaw as Record<string, unknown>) : {};
  const pickUi = (key: string, fallback: string): string => {
    const v = uiText[key];
    return typeof v === "string" && v ? v : fallback;
  };

  const pageEnabledRaw = settings.pageEnabled;
  const pageEnabled =
    pageEnabledRaw && typeof pageEnabledRaw === "object" && !Array.isArray(pageEnabledRaw)
      ? (pageEnabledRaw as Record<string, boolean>)
      : DEFAULT_PUBLIC_SITE_INFO.pageEnabled;

  const footerLinksRaw = settings.footerLinks;
  const footerLinks = Array.isArray(footerLinksRaw)
    ? (footerLinksRaw as { label: string; page: string }[])
    : DEFAULT_PUBLIC_SITE_INFO.footerLinks;

  const servicesRaw = settings.services;
  const services = Array.isArray(servicesRaw)
    ? (servicesRaw as { id?: string; title?: string }[])
        .filter((s) => s && typeof s.title === "string")
        .map((s, i) => ({ id: s.id || `s${i}`, title: s.title as string }))
    : DEFAULT_PUBLIC_SITE_INFO.services;

  // Richer version of the same settings.services row (icon/desc/deliverables), for the
  // standalone /packages page -- real CMS data, same source as `services` above, just kept
  // in its own field so nothing existing changes shape.
  const packagesServices = Array.isArray(servicesRaw)
    ? (servicesRaw as { id?: string; icon?: string; title?: string; desc?: string; deliverables?: string[] }[])
        .filter((s) => s && typeof s.title === "string")
        .map((s, i) => ({
          id: s.id || `s${i}`,
          icon: typeof s.icon === "string" ? s.icon : undefined,
          title: s.title as string,
          desc: typeof s.desc === "string" ? s.desc : undefined,
          deliverables: Array.isArray(s.deliverables) ? s.deliverables.filter((d) => typeof d === "string") : undefined,
        }))
    : DEFAULT_PUBLIC_SITE_INFO.packagesServices;

  // Real pricing tiers from Settings > Packages (settings.pricingPackages) -- the same data
  // the homepage SPA's own in-memory Packages view renders as flip-cards.
  const pricingPackagesRaw = settings.pricingPackages;
  const pricingPackages = Array.isArray(pricingPackagesRaw)
    ? (pricingPackagesRaw as { id?: string; icon?: string; label?: string; price?: string; priceNote?: string; desc?: string; image?: string; ctaLabel?: string; features?: string[] }[])
        .filter((p) => p && typeof p.label === "string")
        .map((p, i) => ({
          id: p.id || `p${i}`,
          icon: typeof p.icon === "string" ? p.icon : undefined,
          label: p.label as string,
          price: typeof p.price === "string" ? p.price : "",
          priceNote: typeof p.priceNote === "string" ? p.priceNote : undefined,
          desc: typeof p.desc === "string" ? p.desc : undefined,
          image: typeof p.image === "string" ? p.image : undefined,
          ctaLabel: typeof p.ctaLabel === "string" ? p.ctaLabel : undefined,
          features: Array.isArray(p.features) ? p.features.filter((f) => typeof f === "string") : undefined,
        }))
    : DEFAULT_PUBLIC_SITE_INFO.pricingPackages;

  return {
    siteName: pick("siteName"),
    siteTagline: pick("siteTagline"),
    phone: pick("phone"),
    email: pick("email"),
    location: pick("location"),
    instagram: pick("instagram"),
    youtube: pick("youtube"),
    linkedin: pick("linkedin"),
    footerCopyright: pick("footerCopyright"),
    address: pick("address"),
    waNumber: pick("waNumber"),
    waMsg: pick("waMsg"),
    tiktok: pick("tiktok"),
    pageEnabled,
    footerLinks,
    services,
    navBookBtn: pickUi("navBookBtn", DEFAULT_PUBLIC_SITE_INFO.navBookBtn),
    footerWhatsappBtn: pickUi("footerWhatsappBtn", DEFAULT_PUBLIC_SITE_INFO.footerWhatsappBtn),
    aboutName: pick("aboutName"),
    aboutTitle: pick("aboutTitle"),
    aboutBio: pick("aboutBio"),
    aboutPhoto: pick("aboutPhoto"),
    statsYears: pick("statsYears"),
    statsProjects: pick("statsProjects"),
    statsClients: pick("statsClients"),
    aboutBannerEyebrow: pickUi("aboutBannerEyebrow", DEFAULT_PUBLIC_SITE_INFO.aboutBannerEyebrow),
    aboutBannerTitle: pickUi("aboutBannerTitle", DEFAULT_PUBLIC_SITE_INFO.aboutBannerTitle),
    contactBannerEyebrow: pickUi("contactBannerEyebrow", DEFAULT_PUBLIC_SITE_INFO.contactBannerEyebrow),
    contactBannerTitle: pickUi("contactBannerTitle", DEFAULT_PUBLIC_SITE_INFO.contactBannerTitle),
    workBannerEyebrow: pickUi("workBannerEyebrow", DEFAULT_PUBLIC_SITE_INFO.workBannerEyebrow),
    workBannerTitle: pickUi("workBannerTitle", DEFAULT_PUBLIC_SITE_INFO.workBannerTitle),
    packagesBannerEyebrow: pickUi("packagesBannerEyebrow", DEFAULT_PUBLIC_SITE_INFO.packagesBannerEyebrow),
    packagesBannerTitle: pickUi("packagesBannerTitle", DEFAULT_PUBLIC_SITE_INFO.packagesBannerTitle),
    pricingPackages,
    packagesServices,
  };
}

// Mirrors app/page.tsx's submitContact()'s Supabase write step (addContactLead): read the
// existing nap_contact_submissions array, prepend the new lead, cap at 500, write back with
// the same upsert pattern. Runs client-side (browser fetch against Supabase's PostgREST
// endpoint using the public anon key) from the standalone /contact page's form -- the same
// anon key the CMS itself uses for unauthenticated writes, so this works identically for a
// visitor who has never logged in. Best-effort: never throws, since a lead that fails to
// persist to Supabase should not block the WhatsApp deep-link (the caller's other real
// notification path) from opening.
export type ContactLeadInput = {
  id: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export async function submitContactLead(entry: ContactLeadInput): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    const getRes = await fetchWithRetry(
      `${url}/rest/v1/site_settings?select=value&key=eq.nap_contact_submissions`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      2
    );
    let existing: ContactLeadInput[] = [];
    if (getRes) {
      const rows = (await getRes.json()) as { value?: string }[];
      const raw = rows?.[0]?.value;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) existing = parsed;
        } catch {
          existing = [];
        }
      }
    }
    const next = [entry, ...existing].slice(0, 500);
    const putRes = await fetchWithRetry(
      `${url}/rest/v1/site_settings?on_conflict=key`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({ key: "nap_contact_submissions", value: JSON.stringify(next) }),
      },
      2
    );
    if (putRes) {
      try {
        fetch("/api/notify/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "new_lead", id: entry.id }),
        }).catch(() => {});
      } catch {}
    }
    return !!putRes;
  } catch {
    return false;
  }
}
