// POST /api/admin/lead-finder (admin only) -- the "Lead Finder" agent.
//   { action:"search", niche, area, source:"osm"|"google", limit }  -> companies (not saved yet)
//   { action:"enrich", leads:[{website}] }  -> public business emails found on each company's own
//        website (home + contact page), checked for a working mail server (MX) via free DNS.
//   { action:"save", leads:[...], tag }  -> saved into Contacts (outreach_companies +
//        outreach_contacts) with a tag, so Email Designer > Campaigns can target them. Duplicates
//        (same website or email) are skipped, never doubled.
// Free sources: OpenStreetMap (no key). Google Places is used only if GOOGLE_PLACES_KEY is set.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const NICHE_OSM: Record<string, string[]> = {
  interior: ['["shop"="interior_decoration"]', '["office"="interior_design"]', '["craft"="interior_decorator"]', '["office"]["name"~"interior",i]', '["shop"="furniture"]["name"~"interior|design",i]'],
  "real estate": ['["office"="estate_agent"]', '["office"="real_estate"]', '["office"]["name"~"real estate|properties|realty|developer",i]'],
  hotel: ['["tourism"="hotel"]'],
  restaurant: ['["amenity"="restaurant"]["website"]', '["amenity"="cafe"]["website"]'],
  events: ['["office"]["name"~"event|exhibition",i]'],
  architecture: ['["office"="architect"]', '["office"]["name"~"architect",i]'],
  corporate: ['["office"="company"]["website"]'],
  fashion: ['["shop"="clothes"]["website"]', '["shop"="boutique"]'],
  beauty: ['["shop"="beauty"]["website"]', '["shop"="hairdresser"]["website"]'],
};
const clean = (s: any) => String(s || "").trim();
// UAE mobile numbers start 05x / +971 5x -> stored as WhatsApp/mobile; anything else = landline.
const isMobile = (p: string) => /^(\+?971|00971|0)?\s*5\d/.test(String(p || "").replace(/[\s()-]/g, ""));
const normSite = (u: string) => { const v = clean(u); if (!v) return ""; try { const x = new URL(/^https?:/i.test(v) ? v : "https://" + v); return x.origin; } catch { return ""; } };
const domain = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

async function searchOSM(niche: string, area: string, limit: number) {
  const key = Object.keys(NICHE_OSM).find((k) => niche.toLowerCase().includes(k)) || "";
  const filters = key ? NICHE_OSM[key] : [`["name"~"${niche.replace(/[^\w\s-]/g, "")}",i]`];
  // Area -> bounding box via OpenStreetMap's free geocoder (Dubai is built in).
  let bbox = "24.79,54.89,25.40,55.65";
  if (!/^dubai$/i.test(area.trim())) {
    const g = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(area + ", UAE")}`, { headers: { "User-Agent": "bynaveedanjum.com lead finder" } });
    const gj: any = g.ok ? await g.json().catch(() => []) : [];
    const bb = gj?.[0]?.boundingbox; if (bb) bbox = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`; else throw new Error(`Couldn't find the area "${area}".`);
  }
  const parts = filters.flatMap((f) => [`node${f}(${bbox});`, `way${f}(${bbox});`]).join("");
  const q = `[out:json][timeout:14];(${parts});out center tags ${Math.min(limit * 3, 600)};`;
  // Several free OpenStreetMap servers -- if one is busy or slow, try the next.
  let j: any = null;
  for (const host of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]) {
    try {
      const r = await fetch(host, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "bynaveedanjum.com lead finder (booking@bynaveedanjum.com)", Accept: "application/json" }, body: "data=" + encodeURIComponent(q), signal: AbortSignal.timeout(15000) });
      if (!r.ok) continue;
      j = JSON.parse(await r.text()); break;
    } catch {}
  }
  if (!j) throw new Error("OpenStreetMap is busy right now — please try again in a minute.");
  return (j.elements || []).map((e: any) => {
    const t = e.tags || {};
    return { name: clean(t.name || t["name:en"]), website: normSite(t.website || t["contact:website"] || t.url), phone: clean(t.phone || t["contact:phone"]), email: clean(t.email || t["contact:email"]).toLowerCase(), address: [t["addr:street"], t["addr:city"]].filter(Boolean).join(", "), rating: "", source: "OpenStreetMap" };
  }).filter((x: any) => x.name);
}

async function searchGoogle(env: any, niche: string, area: string, limit: number) {
  const out: any[] = []; let pageToken = "";
  for (let i = 0; i < 3 && out.length < limit; i++) {
    if ((await googleCallsThisMonth(env)) >= GOOGLE_MONTHLY_CAP) { if (out.length) break; throw new Error("Google's free monthly limit is reached — use OpenStreetMap until next month."); }
    await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: "lead-finder", action: "google_places_call", entity_type: "lead_finder", details: { q: `${niche} in ${area}` } }) }).catch(() => {});
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY, "X-Goog-FieldMask": "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.rating,nextPageToken" }, body: JSON.stringify({ textQuery: `${niche} in ${area}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }) });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || "Google Places error.");
    for (const p of j.places || []) out.push({ name: clean(p.displayName?.text), website: normSite(p.websiteUri), phone: clean(p.internationalPhoneNumber || p.nationalPhoneNumber), email: "", address: clean(p.formattedAddress), rating: p.rating ? String(p.rating) : "", source: "Google Places" });
    pageToken = j.nextPageToken || ""; if (!pageToken) break;
  }
  return out;
}

const JUNK = /(example|sentry|wixpress|domain\.com|yourdomain|email\.com|\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|godaddy|cloudflare|noreply|no-reply)/i;
async function findEmails(site: string): Promise<string[]> {
  const found = new Set<string>(); const d = domain(site);
  // Home + contact pages fetched in parallel, each with a short timeout (keeps the request fast).
  const pages = await Promise.all(["", "/contact", "/contact-us"].map(async (path) => {
    try { const r = await fetch(site + path, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" }, redirect: "follow", signal: AbortSignal.timeout(5000) }); return r.ok ? (await r.text()).slice(0, 400000) : ""; } catch { return ""; }
  }));
  for (const raw of pages) {
    const html = raw.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, "@");
    for (const m of html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) { const e = m.toLowerCase().replace(/^mailto:/, ""); if (!JUNK.test(e) && e.length < 80) found.add(e); }
  }
  return [...found].sort((a, b) => Number(b.endsWith("@" + d) || b.endsWith("." + d)) - Number(a.endsWith("@" + d) || a.endsWith("." + d))).slice(0, 3);
}
async function hasMx(email: string): Promise<boolean> {
  try { const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(email.split("@")[1])}&type=MX`, { headers: { Accept: "application/dns-json" } }); const j: any = await r.json(); return Array.isArray(j.Answer) && j.Answer.length > 0; } catch { return false; }
}

// Google stays inside its free monthly allowance: we count every Places call this month and stop
// before the limit (default 3,000 calls; Google's free tier for Text Search is higher).
const GOOGLE_MONTHLY_CAP = 3000;
async function googleCallsThisMonth(env: any): Promise<number> {
  const d = new Date(); const since = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const r = await supaAdmin(env, `audit_log?action=eq.google_places_call&created_at=gte.${since}&select=id`, { method: "GET", headers: { Prefer: "count=exact", Range: "0-0" } });
  const m = /\/(\d+)$/.exec(r.headers.get("content-range") || ""); return m ? Number(m[1]) : 0;
}

export const onRequestPost: PagesFunction<AdminEnv & any> = async ({ request, env: rawEnv }) => {
  const env: any = { ...rawEnv, GOOGLE_PLACES_KEY: rawEnv.GOOGLE_PLACES_KEY || rawEnv.GOOGLE_PLACES_API_KEY };
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const b = (await request.json().catch(() => ({}))) as any;
  try {
    if (b.action === "search") {
      const niche = clean(b.niche).slice(0, 60), area = clean(b.area || "Dubai").slice(0, 60);
      if (!niche) return json({ error: "Type what kind of companies to find." }, 400, origin);
      const limit = Math.min(Math.max(Number(b.limit) || 60, 5), 200);
      const useGoogle = b.source === "google";
      if (useGoogle && !env.GOOGLE_PLACES_KEY) return json({ error: "Google Places isn't connected yet — use OpenStreetMap (free), or add GOOGLE_PLACES_KEY." }, 400, origin);
      let rows = useGoogle ? await searchGoogle(env, niche, area, limit) : await searchOSM(niche, area, limit);
      const seen = new Set<string>(); rows = rows.filter((x: any) => { const k = domain(x.website) || x.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      // mark ones already in Contacts
      const ex = await supaAdmin(env, "outreach_companies?select=name,website,email&limit=5000", { method: "GET" });
      const have = ex.ok ? ((await ex.json()) as any[]) : [];
      const haveKeys = new Set(have.flatMap((c) => [domain(normSite(c.website)), clean(c.email).toLowerCase(), clean(c.name).toLowerCase()]).filter(Boolean));
      rows = rows.slice(0, limit).map((x: any) => ({ ...x, already: haveKeys.has(domain(x.website)) || (x.email && haveKeys.has(x.email)) || haveKeys.has(x.name.toLowerCase()) }));
      return json({ leads: rows, google: !!env.GOOGLE_PLACES_KEY }, 200, origin);
    }
    if (b.action === "enrich") {
      const list = (Array.isArray(b.leads) ? b.leads : []).slice(0, 4);
      const out = await Promise.all(list.map(async (l: any) => {
        const site = normSite(l.website); let emails: string[] = l.email ? [String(l.email).toLowerCase()] : [];
        if (!emails.length && site) emails = await findEmails(site);
        const email = emails[0] || "";
        return { website: l.website, email, alt: emails.slice(1), mx: email ? await hasMx(email) : false };
      }));
      return json({ results: out }, 200, origin);
    }
    if (b.action === "save") {
      const tagName = clean(b.tag).slice(0, 80) || "Lead Finder";
      const tr = await supaAdmin(env, "outreach_tags?on_conflict=name", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ name: tagName }) });
      let tag = tr.ok ? ((await tr.json()) as any[])?.[0] : null;
      if (!tag) { const g = await supaAdmin(env, `outreach_tags?name=eq.${encodeURIComponent(tagName)}&select=id`, { method: "GET" }); tag = g.ok ? ((await g.json()) as any[])?.[0] : null; }
      const ex = await supaAdmin(env, "outreach_companies?select=id,name,website,email&limit=5000", { method: "GET" });
      const have = ex.ok ? ((await ex.json()) as any[]) : [];
      let saved = 0, skipped = 0;
      for (const l of (Array.isArray(b.leads) ? b.leads : []).slice(0, 200)) {
        const site = normSite(l.website), email = clean(l.email).toLowerCase();
        if (have.some((c) => (site && domain(normSite(c.website)) === domain(site)) || (email && clean(c.email).toLowerCase() === email))) { skipped++; continue; }
        const cr = await supaAdmin(env, "outreach_companies", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: clean(l.name).slice(0, 200), industry: clean(b.niche || l.niche).slice(0, 80) || null, website: site || null, email: email || null, phone: !isMobile(l.phone) ? clean(l.phone) || null : null, whatsapp: isMobile(l.phone) ? clean(l.phone) : null, city: clean(b.area || "Dubai"), country: "UAE", address: clean(l.address) || null, source: `Lead Finder · ${clean(l.source) || "OpenStreetMap"}`, notes: l.rating ? `Rating ${l.rating}` : null }) });
        const comp = cr.ok ? ((await cr.json()) as any[])?.[0] : null; if (!comp) { skipped++; continue; }
        have.push(comp);
        if (email) {
          const pr = await supaAdmin(env, "outreach_contacts", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ company_id: comp.id, full_name: null, email, phone: !isMobile(l.phone) ? clean(l.phone) || null : null, whatsapp: isMobile(l.phone) ? clean(l.phone) : null, website: site || null, city: clean(b.area || "Dubai"), country: "UAE", source: "Lead Finder" }) });
          const person = pr.ok ? ((await pr.json()) as any[])?.[0] : null;
          if (person && tag) await supaAdmin(env, "outreach_contact_tags", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ contact_id: person.id, tag_id: tag.id }) });
        }
        if (tag) await supaAdmin(env, "outreach_company_tags", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ company_id: comp.id, tag_id: tag.id }) });
        saved++;
      }
      return json({ ok: true, saved, skipped, tag: tagName }, 200, origin);
    }
    return json({ error: "Unknown action." }, 400, origin);
  } catch (e: any) { return json({ error: e?.message || "Lead Finder error." }, 502, origin); }
};
