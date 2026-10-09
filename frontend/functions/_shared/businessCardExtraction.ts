// Business card OCR/AI extraction.
//
// PROVIDER ABSTRACTION: scan.ts calls extractBusinessCard(env, imageDataUrl) and gets back a
// plain ExtractionResult -- nothing outside this file knows which model ran.
//
// PROVIDERS (all Cloudflare Workers AI, free tier, already bound as env.AI): modern vision
// models tried in order; the first one that yields usable fields wins. The old llava-1.5
// model is kept only as a last resort -- it was the cause of "takes picture but reads nothing".
//
// ENGLISH ONLY: many UAE cards are bilingual. The prompt asks for the English side only, and
// a deterministic post-filter strips Arabic-script characters from every value (a value that
// was Arabic-only is dropped). Emails / phones / websites are also pulled with plain regexes
// from the model's raw text as a safety net.
//
// HONESTY: no model here returns a real confidence score, so results are "needs_review"
// (or "uncertain" when nearly nothing was found). Nothing is ever auto-saved.

export type ExtractedFields = {
  full_name?: string; first_name?: string; last_name?: string; job_title?: string;
  company_name?: string; company_website?: string; email?: string; secondary_email?: string;
  phone?: string; mobile?: string; whatsapp?: string; fax?: string; website?: string;
  linkedin?: string; instagram?: string; facebook?: string; twitter?: string;
  address?: string; city?: string; country?: string;
};

export type ReviewState = "high_confidence" | "needs_review" | "uncertain";

export type ExtractionResult = {
  ok: boolean;
  extracted: ExtractedFields;
  raw_text: string;
  review_state: ReviewState;
  detected_language: "en" | "ar" | "mixed" | "unknown";
  provider: string;
  error?: string;
};

type AIEnv = { AI?: { run(model: string, input: unknown): Promise<any> } };

const ALLOWED_KEYS: (keyof ExtractedFields)[] = [
  "full_name", "first_name", "last_name", "job_title", "company_name",
  "company_website", "email", "secondary_email", "phone", "mobile",
  "whatsapp", "fax", "website", "linkedin", "instagram", "facebook",
  "twitter", "address", "city", "country",
];

const PROMPT = `Read this business card photo and extract the contact details.
Return ONLY one JSON object (no prose, no markdown) using any of these keys, every value a plain string:
full_name, first_name, last_name, job_title, company_name, company_website, email, secondary_email, phone, mobile, whatsapp, fax, website, linkedin, instagram, facebook, twitter, address, city, country.
Rules:
- ENGLISH ONLY. The card may also have Arabic text: ignore all Arabic completely. Never output Arabic characters.
- Only include information actually printed on the card. Omit keys that are not present. Never guess.
- Copy text exactly (spelling, capitalisation). Phone numbers with + and country code as printed.
- Split the person's name into first_name and last_name. If no country is printed but a UAE emirate is, set country to "United Arab Emirates".`;

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const bin = atob(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;

function detectLanguage(text: string): ExtractionResult["detected_language"] {
  if (!text) return "unknown";
  const hasArabic = /[؀-ۿ]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  if (hasLatin) return "en";
  return "unknown";
}

// Keep only the English part of a value: strip Arabic-script chars, tidy leftover separators.
function englishOnly(v: string): string {
  return v
    .replace(ARABIC, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|/,\-–]+|[\s|/,\-–]+$/g, "")
    .trim();
}

function safeParseExtracted(raw: string): ExtractedFields {
  if (!raw) return {};
  const cleaned = raw.replace(/```(?:json)?/gi, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(match[0]); }
  catch {
    try { parsed = JSON.parse(match[0].replace(/,\s*([}\]])/g, "$1")); } catch { return {}; }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: ExtractedFields = {};
  for (const key of ALLOWED_KEYS) {
    const val = (parsed as Record<string, unknown>)[key];
    if (typeof val !== "string" && typeof val !== "number") continue;
    const trimmed = englishOnly(String(val));
    if (trimmed.length < 2) continue;
    if (/^(n\/a|na|none|null|unknown|not (visible|present|found|available)|-)$/i.test(trimmed)) continue;
    out[key] = trimmed;
  }
  return out;
}

// Deterministic safety net: fill obvious contact fields straight from the raw model text.
function regexFill(raw: string, out: ExtractedFields): ExtractedFields {
  const text = raw.replace(ARABIC, " ");
  const emails = Array.from(new Set(text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []));
  if (!out.email && emails[0]) out.email = emails[0];
  if (!out.secondary_email && emails[1] && emails[1] !== out.email) out.secondary_email = emails[1];
  if (!out.website) {
    const w = text.match(/\b(?:https?:\/\/)?(?:www\.)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:\/[^\s"']*)?/i);
    if (w) out.website = w[0];
  }
  if (!out.phone && !out.mobile) {
    const p = text.match(/\+?\d[\d\s().-]{7,}\d/);
    if (p) out.phone = p[0].replace(/\s{2,}/g, " ").trim();
  }
  return out;
}

function finalize(e: ExtractedFields): ExtractedFields {
  if ((!e.first_name || !e.last_name) && e.full_name) {
    const parts = e.full_name.split(/\s+/);
    if (!e.first_name) e.first_name = parts[0];
    if (!e.last_name && parts.length > 1) e.last_name = parts.slice(1).join(" ");
  }
  if (!e.phone && e.mobile) e.phone = e.mobile;
  if (e.email) e.email = e.email.toLowerCase().replace(/\s/g, "");
  if (!e.company_website && e.website) e.company_website = e.website;
  return e;
}

// Each provider returns the model's raw text. Workers AI vision models differ in input shape.
type Provider = { name: string; run: (env: AIEnv, img: string) => Promise<string> };

function textOf(out: any): string {
  if (!out) return "";
  if (typeof out === "string") return out;
  if (typeof out.response === "string") return out.response;
  if (out.response && typeof out.response === "object") return JSON.stringify(out.response);
  if (typeof out.description === "string") return out.description;
  const c = out?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : "";
}

const PROVIDERS: Provider[] = [
  {
    name: "workers-ai:llama-3.2-11b-vision",
    run: async (env, img) => {
      const model = "@cf/meta/llama-3.2-11b-vision-instruct";
      const call = () => env.AI!.run(model, {
        messages: [{ role: "user", content: PROMPT }],
        image: Array.from(dataUrlToBytes(img)),
        max_tokens: 700,
        temperature: 0.1,
      });
      try { return textOf(await call()); }
      catch (e: any) {
        // Meta's license must be accepted once per account; do it automatically and retry.
        if (/agree/i.test(String(e?.message || e))) {
          await env.AI!.run(model, { prompt: "agree" }).catch(() => {});
          return textOf(await call());
        }
        throw e;
      }
    },
  },
  {
    name: "workers-ai:mistral-small-3.1-vision",
    run: async (env, img) => textOf(await env.AI!.run("@cf/mistralai/mistral-small-3.1-24b-instruct", {
      messages: [{ role: "user", content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: img } },
      ] }],
      max_tokens: 700,
      temperature: 0.1,
    })),
  },
  {
    name: "workers-ai:llava-1.5-7b",
    run: async (env, img) => textOf(await env.AI!.run("@cf/llava-hf/llava-1.5-7b-hf", {
      image: Array.from(dataUrlToBytes(img)), prompt: PROMPT, max_tokens: 512,
    })),
  },
];

const CORE: (keyof ExtractedFields)[] = ["first_name", "last_name", "full_name", "email", "phone", "mobile", "company_name"];

export async function extractBusinessCard(env: AIEnv, imageDataUrl: string): Promise<ExtractionResult> {
  if (!env.AI) {
    return { ok: false, extracted: {}, raw_text: "", review_state: "uncertain",
      detected_language: "unknown", provider: "none", error: "not_configured" };
  }
  let best: { extracted: ExtractedFields; raw: string; provider: string; score: number } | null = null;
  const errors: string[] = [];
  for (const p of PROVIDERS) {
    try {
      const raw = (await p.run(env, imageDataUrl)).trim();
      const extracted = finalize(regexFill(raw, safeParseExtracted(raw)));
      const score = CORE.filter((k) => extracted[k]).length;
      if (!best || score > best.score) best = { extracted, raw, provider: p.name, score };
      if (score >= 3) break; // good enough -- don't spend more calls
    } catch (e: any) {
      errors.push(`${p.name}: ${String(e?.message || e).slice(0, 120)}`);
    }
  }
  if (!best) {
    return { ok: false, extracted: {}, raw_text: errors.join(" | "), review_state: "uncertain",
      detected_language: "unknown", provider: "none", error: "provider_error" };
  }
  const fieldCount = Object.keys(best.extracted).length;
  return {
    ok: true,
    extracted: best.extracted,
    raw_text: best.raw,
    review_state: fieldCount <= 1 ? "uncertain" : "needs_review",
    detected_language: detectLanguage(best.raw),
    provider: best.provider,
  };
}
