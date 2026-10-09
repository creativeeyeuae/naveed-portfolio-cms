// POST /api/admin/business-cards/scan -- OCR/vision extraction for the Business Card Scanner.
//
// Part 3: now performs real extraction via Cloudflare Workers AI (env.AI -- already bound in
// this project for a different feature, see functions/api/admin/seo/alt-text.ts; no new paid
// service). All provider-specific logic lives in ../../../_shared/businessCardExtraction.ts --
// this file only handles the HTTP contract, auth, validation, and best-effort scan logging.
//
// Nothing here changes the review-before-save contract: the frontend still always shows the
// review screen and nothing is ever auto-saved from this endpoint (save.ts, unchanged, is the
// only place a contact gets created).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { extractBusinessCard, type ExtractedFields } from "../../../_shared/businessCardExtraction";
import { extraFieldsAsNotes } from "../../../_shared/outreachHelpers";
import { validateImageDataUrl } from "../../../_shared/imageValidation";
import { uploadBusinessCardImage } from "../../../_shared/businessCardStorage";

// Fields the review form (HomeClient.tsx bcForm) has an actual input for. Everything else
// extraction finds (mobile, secondary_email, fax, instagram, facebook, twitter) still gets
// surfaced -- folded into a suggested notes line -- rather than silently dropped.
const FORM_KEYS: (keyof ExtractedFields)[] = [
  "first_name", "last_name", "job_title", "company_name", "company_website",
  "email", "phone", "whatsapp", "website", "linkedin", "address", "city", "country",
];
function splitForForm(extracted: ExtractedFields) {
  const forForm: Record<string, string> = {};
  const extra: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(extracted)) {
    if (!v) continue;
    if (FORM_KEYS.includes(k as keyof ExtractedFields)) forForm[k] = v as string;
    else extra[k] = v as string;
  }
  return { forForm, notesSuggestion: extraFieldsAsNotes(extra) };
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // ~8MB decoded; keeps the AI call and the DB row sane

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { image?: string };
  const image = typeof body.image === "string" ? body.image : "";

  // Part 2 (Business Card image processing / secure upload foundation): real magic-byte +
  // dimension validation, never trusting the data: URL's own declared MIME alone. Rejects
  // anything that isn't an actual JPEG/PNG/WEBP, anything decompression-bomb-sized, and
  // anything with nonsensical dimensions -- all with a user-friendly message, never a raw
  // technical error.
  const validated = validateImageDataUrl(image, MAX_IMAGE_BYTES);
  if (!validated.ok) {
    return json({ error: validated.error, message: validated.message }, 400, origin);
  }

  const result = await extractBusinessCard(env, image);

  if (!result.ok && result.error === "not_configured") {
    // Unchanged from before Part 3: Workers AI isn't bound (e.g. a preview/dev deploy without
    // wrangler.toml's [ai] binding). Same graceful message the frontend already handles.
    return json(
      { error: "not_configured", message: "Business card OCR is not set up yet -- you can still add a contact manually, or type in the card's details by hand." },
      503,
      origin
    );
  }

  // Best-effort scan log -- never blocks the response. If migration 0012 hasn't been run yet,
  // this insert simply fails silently and the rest of the flow (extraction, review, save) is
  // completely unaffected, exactly as it was before this table existed.
  let scanId: string | null = null;
  try {
    // Part 2B: upload to private Supabase Storage and store only the returned path -- never
    // the raw base64 -- for newly created scan rows. On upload failure uploadBusinessCardImage
    // resolves to null (it never throws) and we store null rather than falling back to base64,
    // per "Raw base64 image data is no longer stored in the database for newly created scans."
    const storedImagePath = await uploadBusinessCardImage(env, validated.bytes, validated.mime);
    const row = {
      status: result.ok ? "extracted" : "rejected",
      card_image: storedImagePath,
      raw_text: result.raw_text || null,
      extracted: result.extracted,
      review_state: result.review_state,
      detected_language: result.detected_language,
      provider: result.provider,
      error: result.error || null,
      created_by: admin.email,
    };
    const res = await supaAdmin(env, "business_card_scans", { method: "POST", body: JSON.stringify(row) });
    if (res.ok) scanId = ((await res.json()) as any[])?.[0]?.id || null;
  } catch {
    // Table may not exist yet (migration 0012 not run) or the insert failed for any other
    // reason -- logging the scan is a nice-to-have, not a requirement for scanning to work.
  }

  if (!result.ok) {
    return json(
      { error: result.error || "extraction_failed", message: "Couldn't read that card automatically -- please fill in the details below by hand.", scan_id: scanId },
      200,
      origin
    );
  }

  const { forForm, notesSuggestion } = splitForForm(result.extracted);

  return json(
    {
      extracted: forForm, // only fields bcForm actually has inputs for -- bcHandleFile's
      // existing merge (setBcForm(f => ({...f, ...data.extracted}))) keeps working unchanged
      all: result.extracted, // every non-empty field read (mobile/office/fax/socials...) -- the
      // review form classifies these into its main fields + auto-added extra rows
      notes_suggestion: notesSuggestion || undefined, // anything extra (mobile, fax, social
      // links, etc.) folded into a suggested notes line instead of being silently dropped
      review_state: result.review_state,
      detected_language: result.detected_language,
      scan_id: scanId,
    },
    200,
    origin
  );
};
