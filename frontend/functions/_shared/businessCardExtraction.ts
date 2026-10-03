// Business card OCR/AI extraction (Part 3).
//
// PROVIDER ABSTRACTION: nothing outside this file knows which model/provider
// ran the extraction. scan.ts calls extractBusinessCard(env, imageDataUrl)
// and gets back a plain ExtractionResult -- swapping the provider later
// (a different Workers AI model, an external OCR/vision API, a local
// OCR engine) only ever means changing the body of runProvider() below.
//
// CURRENT PROVIDER: Cloudflare Workers AI (env.AI), already bound in this
// exact project for a different feature (see functions/api/admin/seo/
// alt-text.ts) -- no new paid service, no new signup. Uses the same
// vision-captioning model already proven to work in this account
// (@cf/llava-hf/llava-1.5-7b-hf), prompted to return structured JSON.
//
// HONESTY ABOUT CONFIDENCE: this model does not return a real numerical
// confidence score. We never invent one. Every successful extraction is
// marked "needs_review" (not "high_confidence") until real-world accuracy
// on actual cards justifies trusting it further -- see the Part 2 audit.
// "uncertain" is used only when extraction produced effectively nothing.

export type ExtractedFields = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company_name?: string;
  company_website?: string;
  email?: string;
  secondary_email?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  fax?: string;
  website?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  address?: string;
  city?: string;
  country?: string;
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

const MODEL = "@cf/llava-hf/llava-1.5-7b-hf";
const PROVIDER_NAME = "workers-ai:llava-1.5-7b";

// The exact set of keys we will ever read out of the model's JSON -- anything
// else it returns is discarded. This is the schema validation step: AI output
// is never trusted or inserted anywhere just because it parsed as JSON.
const ALLOWED_KEYS: (keyof ExtractedFields)[] = [
  "full_name", "first_name", "last_name", "job_title", "company_name",
  "company_website", "email", "secondary_email", "phone", "mobile",
  "whatsapp", "fax", "website", "linkedin", "instagram", "facebook",
  "twitter", "address", "city", "country",
];

const PROMPT = `You are reading a photo of a business card. Return ONLY a single JSON object (no prose, no markdown fences) with these keys, every value a plain string: full_name, first_name, last_name, job_title, company_name, company_website, email, secondary_email, phone, mobile, whatsapp, fax, website, linkedin, instagram, facebook, twitter, address, city, country.
Rules:
- Only include a key if that exact information is visibly printed on the card.
- Omit (do not guess) any key not clearly present.
- Copy names, company names and addresses exactly as printed, including Arabic text if present -- do not translate them.
- Do not invent, assume, or autocomplete anything not actually on the card.`;

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Arabic-script heuristic (deterministic, not AI): checks the Arabic Unicode
// block. This is a real, checkable signal -- not a fabricated label.
function detectLanguage(text: string): ExtractionResult["detected_language"] {
  if (!text) return "unknown";
  const hasArabic = /[؀-ۿ]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  if (hasLatin) return "en";
  return "unknown";
}

// Pulls the first {...} block out of the model's raw text (models routinely
// wrap JSON in a sentence or markdown fence despite instructions) and parses
// it defensively. Never throws -- a parse failure is a normal, expected
// outcome here, not an exception to propagate.
function safeParseExtracted(raw: string): ExtractedFields {
  if (!raw) return {};
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: ExtractedFields = {};
  for (const key of ALLOWED_KEYS) {
    const val = (parsed as Record<string, unknown>)[key];
    if (typeof val === "string") {
      const trimmed = val.trim();
      // Reject placeholder-ish non-answers a model sometimes emits instead of omitting the key.
      if (trimmed && !/^(n\/a|na|none|unknown|not (visible|present|found|available))$/i.test(trimmed)) {
        out[key] = trimmed;
      }
    }
  }
  return out;
}

async function runProvider(env: AIEnv, imageDataUrl: string): Promise<{ raw: string }> {
  const bytes = Array.from(dataUrlToBytes(imageDataUrl));
  const out: any = await env.AI!.run(MODEL, { image: bytes, prompt: PROMPT, max_tokens: 512 });
  const raw = String(out?.description || out?.response || "").trim();
  return { raw };
}

export async function extractBusinessCard(env: AIEnv, imageDataUrl: string): Promise<ExtractionResult> {
  if (!env.AI) {
    return {
      ok: false, extracted: {}, raw_text: "", review_state: "uncertain",
      detected_language: "unknown", provider: PROVIDER_NAME,
      error: "not_configured",
    };
  }
  try {
    const { raw } = await runProvider(env, imageDataUrl);
    const extracted = safeParseExtracted(raw);
    const fieldCount = Object.keys(extracted).length;
    const review_state: ReviewState = fieldCount === 0 ? "uncertain" : "needs_review";
    const languageSource = `${raw} ${Object.values(extracted).join(" ")}`;
    return {
      ok: true, extracted, raw_text: raw, review_state,
      detected_language: detectLanguage(languageSource),
      provider: PROVIDER_NAME,
    };
  } catch (e: any) {
    return {
      ok: false, extracted: {}, raw_text: "", review_state: "uncertain",
      detected_language: "unknown", provider: PROVIDER_NAME,
      error: "provider_error",
    };
  }
}
