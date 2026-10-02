// POST /api/admin/business-cards/scan -- OCR/vision extraction for the Business Card Scanner.
//
// NOT YET LIVE: extracting name/company/phone/email/etc. from a photographed card needs an
// external OCR/vision API (e.g. Google Cloud Vision, OpenAI vision, Azure Document
// Intelligence) that isn't configured for this project yet. Per the standing rule to surface
// any new recurring/per-use paid service before building it, this endpoint is shipped as a
// clear "not configured" response rather than silently wiring in a paid API. Once the user
// picks a provider and its key is added as a Cloudflare Pages secret (env.VISION_API_KEY
// below is the placeholder name), the body of this function is where that call goes -- the
// review-before-save flow in business-cards/save.ts is already built and does not change.
import { requireAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

type ScanEnv = AdminEnv & { VISION_API_KEY?: string };

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<ScanEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (!env.VISION_API_KEY) {
    return json(
      {
        error: "not_configured",
        message:
          "Business card OCR is not set up yet -- it needs an external vision/OCR service and API key that haven't been chosen. You can still add a contact manually, or type in the card's details by hand.",
      },
      503,
      origin
    );
  }

  // Placeholder for once a provider is chosen -- intentionally not implemented.
  return json({ error: "not_configured", message: "Vision provider not implemented yet." }, 503, origin);
};
