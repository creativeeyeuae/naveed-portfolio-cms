// CreativeBot's OFFLINE brain -- runs entirely in the visitor's browser and talks straight to
// Supabase with the site's public key, so it keeps working when the Cloudflare API is
// unavailable (daily limit reached, outage, etc). 100% free: no AI model, no extra service.
//
// It answers from the same knowledge the online AI uses, as far as is safe to read publicly:
//   - Naveed's active chatbot FAQs (chat_faqs -- public read of ACTIVE rows, migration 0021)
//   - services, packages/pricing, contact details and location (nap_settings, already public)
//   - FAQ blocks from the service pages (nap_service_pages, already public)
// Matching is simple keyword scoring (no AI), so it only answers when it's confident; anything
// else is saved to live_chat_offline_messages (insert-only drop box, migration 0021) for
// Naveed to answer, and he sees it in the CMS Live Chat panel.

export type OfflineEntry = { keys: string; answer: string; weight: number };

const STOP = new Set(("a an the and or but if of to for in on at by with from is are was were be been am do does did " +
  "i you we they he she it me my your our us can could would should will shall may might please hi hello hey " +
  "what whats how who where when which why there this that these those any some about have has had get give " +
  "want like need tell know more info information thanks thank ok okay yes no").split(" "));

const SITE_URL = "https://bynaveedanjum.com";

function tokens(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)); // crude plural fold
}

const clean = (s: unknown, max = 400) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

async function readKey(sb: any, key: string): Promise<any> {
  try {
    const { data } = await sb.from("site_settings").select("value").eq("key", key).maybeSingle();
    return data?.value ? JSON.parse(data.value) : null;
  } catch { return null; }
}

export async function loadOfflineKnowledge(sb: any): Promise<OfflineEntry[]> {
  if (!sb) return [];
  const entries: OfflineEntry[] = [];

  try {
    const { data } = await sb.from("chat_faqs").select("question,answer").eq("is_active", true).order("sort_order", { ascending: true }).limit(200);
    for (const f of data || []) if (f?.question && f?.answer) entries.push({ keys: f.question, answer: clean(f.answer, 800), weight: 1.3 });
  } catch {}

  const [settings, servicePages] = await Promise.all([readKey(sb, "nap_settings"), readKey(sb, "nap_service_pages")]);

  if (settings) {
    const services: any[] = Array.isArray(settings.services) ? settings.services : [];
    if (services.length) {
      entries.push({
        keys: "services offer provide do photography videography cinematography shoot type work " + services.map((s) => s?.title).join(" "),
        answer: "Here's what Naveed offers:\n" + services.filter((s) => s?.title).map((s) => `• ${clean(s.title, 80)}${s.desc ? ` — ${clean(s.desc, 120)}` : ""}`).join("\n"),
        weight: 1,
      });
      for (const s of services) if (s?.title) entries.push({ keys: `${s.title} ${s.desc || ""}`, answer: `${clean(s.title, 80)}: ${clean(s.detail || s.desc, 400)}`, weight: 1.1 });
    }
    const packages: any[] = Array.isArray(settings.pricingPackages) ? settings.pricingPackages : [];
    if (packages.length) {
      entries.push({
        keys: "price pricing prices cost costs rate rates package packages budget quote charge fee how much",
        answer: "Here are the current packages:\n" + packages.filter((p) => p?.label).map((p) => `• ${clean(p.label, 80)}: ${clean(p.price, 40) || "price on request"}${p.priceNote ? ` (${clean(p.priceNote, 60)})` : ""}`).join("\n") + `\n\nFull details: ${SITE_URL}/packages`,
        weight: 1.2,
      });
    }
    const contact = [settings.phone && `📞 ${clean(settings.phone, 40)}`, settings.email && `✉️ ${clean(settings.email, 80)}`, settings.waNumber && `💬 WhatsApp: wa.me/${String(settings.waNumber).replace(/[^\d]/g, "")}`].filter(Boolean).join("\n");
    if (contact) entries.push({ keys: "contact phone call number email reach whatsapp talk speak", answer: `You can reach Naveed here:\n${contact}`, weight: 1.1 });
    if (settings.location) entries.push({ keys: "location where based located address city dubai uae travel", answer: `Naveed is based in ${clean(settings.location, 120)} and works across the UAE/GCC — international projects on request.`, weight: 1 });
    entries.push({ keys: "book booking session appointment available availability date schedule reserve hire", answer: `I'd love to help you book! Please tell me the type of shoot, your preferred date and the location — Naveed will confirm availability. You can also use the contact page: ${SITE_URL}/contact`, weight: 1 });
    if (settings.aboutBio) entries.push({ keys: "about who naveed experience background photographer cinematographer", answer: clean(settings.aboutBio, 600), weight: 0.9 });
  }

  if (servicePages && typeof servicePages === "object") {
    for (const page of Object.values<any>(servicePages)) {
      if (!page || page.enabled === false) continue;
      for (const f of Array.isArray(page.faqs) ? page.faqs : []) if (f?.q && f?.a) entries.push({ keys: f.q, answer: clean(f.a, 600), weight: 1.15 });
    }
  }
  return entries;
}

// Returns the best answer, or null when nothing matches confidently enough.
export function answerOffline(question: string, entries: OfflineEntry[]): string | null {
  const q = tokens(question);
  if (!q.length || !entries.length) return null;
  const qs = new Set(q);
  let best: { score: number; answer: string } | null = null;
  for (const e of entries) {
    const k = new Set(tokens(e.keys));
    if (!k.size) continue;
    let hit = 0;
    qs.forEach((w) => { if (k.has(w)) hit++; });
    if (!hit) continue;
    const score = (hit / qs.size) * e.weight + (hit >= 2 ? 0.15 : 0);
    if (!best || score > best.score) best = { score, answer: e.answer };
  }
  return best && best.score >= 0.34 ? best.answer : null;
}

export async function saveOfflineMessage(sb: any, m: { name: string; contact: string; body: string }): Promise<boolean> {
  if (!sb) return false;
  try {
    const page = typeof location !== "undefined" ? location.pathname.slice(0, 300) : null;
    const { error } = await sb.from("live_chat_offline_messages").insert({
      name: m.name.trim().slice(0, 100), contact: m.contact.trim().slice(0, 120), body: m.body.trim().slice(0, 2000), page,
    });
    return !error;
  } catch { return false; }
}
