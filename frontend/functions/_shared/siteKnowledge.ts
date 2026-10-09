// CreativeBot's knowledge of the whole site, built fresh from what's ACTUALLY saved in the
// CMS (Supabase) at the moment a visitor asks -- so anything Naveed adds or edits in the CMS
// (a new project, a new package, a new FAQ) is known to the bot immediately, with no
// retraining and no extra service. 100% free: plain database reads that already happen.
//
// Sources, in priority order:
//   1. Chatbot Q&A (chat_faqs)        -- Naveed's own exact answers; always used first
//   2. Settings (nap_settings)        -- about/bio, contact, location, stats, services, packages
//   3. Service pages (nap_service_pages) -- their FAQ blocks + intros
//   4. Projects (nap_projects)        -- title, categories, client, location, short description + link
//   5. Blog (nap_blog)                -- title + excerpt + link
//   6. Testimonials (nap_testimonials)
// The total is capped (MAX_CHARS) so it fits comfortably in the free AI model's context and
// keeps each reply's free-tier cost tiny; the most important sources go first so a cap only
// ever trims the least important tail.
import { supaAdmin } from "./adminAuth";

const SITE_URL = "https://bynaveedanjum.com";
const MAX_CHARS = 9000;

const clean = (s: unknown, max = 300): string =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")      // strip any HTML from rich text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

async function readKey(env: any, key: string): Promise<any> {
  try {
    const res = await supaAdmin(env, `site_settings?select=value&key=eq.${key}`);
    if (!res.ok) return null;
    const rows = (await res.json()) as { value?: string }[];
    const raw = rows?.[0]?.value;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function buildSiteKnowledge(env: any): Promise<string> {
  const out: string[] = [];

  // 1. Naveed's own FAQ answers.
  try {
    const r = await supaAdmin(env, "chat_faqs?select=question,answer&is_active=eq.true&order=sort_order.asc&limit=200");
    if (r.ok) {
      const faqs = (await r.json()) as { question?: string; answer?: string }[];
      if (faqs.length) {
        out.push("## Naveed's own answers (use these exactly when they match)");
        for (const f of faqs) if (f?.question && f?.answer) out.push(`Q: ${clean(f.question, 200)}\nA: ${clean(f.answer, 600)}`);
      }
    }
  } catch {}

  const [settings, servicePages, projects, blog, testimonials] = await Promise.all([
    readKey(env, "nap_settings"),
    readKey(env, "nap_service_pages"),
    readKey(env, "nap_projects"),
    readKey(env, "nap_blog"),
    readKey(env, "nap_testimonials"),
  ]);

  // 2. Settings: who, where, how to reach, what's offered, what it costs.
  if (settings) {
    out.push("## About");
    if (settings.aboutName || settings.aboutTitle) out.push(`${clean(settings.aboutName, 80)} -- ${clean(settings.aboutTitle, 120)}`);
    if (settings.aboutBio) out.push(clean(settings.aboutBio, 700));
    const stats = [settings.statsYears && `${settings.statsYears} years experience`, settings.statsProjects && `${settings.statsProjects} projects`, settings.statsClients && `${settings.statsClients} clients`].filter(Boolean);
    if (stats.length) out.push(`Highlights: ${stats.join(", ")}`);
    out.push("## Contact");
    if (settings.location) out.push(`Based in: ${clean(settings.location, 120)} (works across UAE/GCC and internationally on request)`);
    if (settings.phone) out.push(`Phone: ${clean(settings.phone, 40)}`);
    if (settings.email) out.push(`Email: ${clean(settings.email, 80)}`);
    if (settings.waNumber) out.push(`WhatsApp: +${String(settings.waNumber).replace(/[^\d]/g, "")}`);
    out.push(`Contact/booking page: ${SITE_URL}/contact   Packages page: ${SITE_URL}/packages   Portfolio: ${SITE_URL}/work`);

    const services: any[] = Array.isArray(settings.services) ? settings.services : [];
    if (services.length) {
      out.push("## Services");
      for (const s of services) {
        if (!s?.title) continue;
        const deliv = Array.isArray(s.deliverables) && s.deliverables.length ? ` Deliverables: ${s.deliverables.slice(0, 6).map((d: any) => clean(d, 60)).join("; ")}.` : "";
        out.push(`- ${clean(s.title, 80)}: ${clean(s.desc || s.detail, 260)}${deliv}`);
      }
    }
    const packages: any[] = Array.isArray(settings.pricingPackages) ? settings.pricingPackages : [];
    if (packages.length) {
      out.push("## Packages & pricing");
      for (const p of packages) {
        if (!p?.label) continue;
        const feats = Array.isArray(p.features) && p.features.length ? ` Includes: ${p.features.slice(0, 6).map((f: any) => clean(f, 60)).join("; ")}.` : "";
        const desc = p.desc ? ` ${clean(p.desc, 160)}` : "";
        out.push(`- ${clean(p.label, 80)}: ${clean(p.price, 40) || "price on request"}${p.priceNote ? ` (${clean(p.priceNote, 80)})` : ""}.${desc}${feats}`);
      }
    }
  }

  // 3. Service pages: their own Q&A blocks and intros.
  if (servicePages && typeof servicePages === "object") {
    const lines: string[] = [];
    for (const [slug, page] of Object.entries<any>(servicePages)) {
      if (!page || page.enabled === false) continue;
      if (page.h1 || page.intro) lines.push(`- ${clean(page.h1 || slug, 90)} (${SITE_URL}/${slug}): ${clean(page.intro, 200)}`);
      for (const f of Array.isArray(page.faqs) ? page.faqs.slice(0, 4) : []) if (f?.q && f?.a) lines.push(`  Q: ${clean(f.q, 140)} A: ${clean(f.a, 260)}`);
    }
    if (lines.length) { out.push("## Service pages"); out.push(...lines); }
  }

  // 4. Projects -- the portfolio, so the bot can point visitors at real examples.
  if (Array.isArray(projects) && projects.length) {
    out.push("## Portfolio projects (share the link when relevant)");
    const sorted = [...projects].sort((a, b) => Number(!!b?.featured) - Number(!!a?.featured));
    for (const p of sorted.slice(0, 30)) {
      if (!p?.title) continue;
      const cats = Array.isArray(p.categories) ? p.categories.join(", ") : "";
      const meta = [cats, p.clientName && `client: ${clean(p.clientName, 60)}`, p.location && clean(p.location, 60)].filter(Boolean).join(" | ");
      out.push(`- ${clean(p.title, 90)}${meta ? ` [${meta}]` : ""}: ${clean(p.description, 160)}${p.slug ? ` ${SITE_URL}/work/${p.slug}` : ""}`);
    }
  }

  // 5. Blog.
  if (Array.isArray(blog) && blog.length) {
    out.push("## Journal / blog posts");
    for (const b of blog.slice(0, 15)) if (b?.title) out.push(`- ${clean(b.title, 100)}: ${clean(b.excerpt, 160)}${b.slug ? ` ${SITE_URL}/journal/${b.slug}` : ""}`);
  }

  // 6. Testimonials.
  if (Array.isArray(testimonials) && testimonials.length) {
    out.push("## What clients say");
    for (const t of testimonials.slice(0, 6)) if (t?.quote) out.push(`- "${clean(t.quote, 220)}" -- ${clean(t.name, 60)}${t.company ? `, ${clean(t.company, 60)}` : ""}`);
  }

  const text = out.join("\n");
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
}
