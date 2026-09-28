// POST /api/admin/clients/:id/consent
//
// Sets one communication-preference category (relationship/service/marketing/promotions/
// events/offers/wishes) to allowed or not-allowed, and appends a permanent record of the
// change to consent_events -- the change itself is never lost, even after the preference
// flips again later. A contact created before this feature existed has no rows yet, so
// every category defaults to NOT allowed until explicitly turned on here -- scanning a
// business card or booking a shoot is never treated as consent for anything.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

const CATEGORIES = ["relationship", "service", "marketing", "promotions", "events", "offers", "wishes"] as const;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as { category?: string; allowed?: boolean; source?: string; method?: string };
  const category = body.category || "";
  if (!(CATEGORIES as readonly string[]).includes(category)) return json({ error: "Unknown consent category." }, 400, origin);
  const allowed = !!body.allowed;

  const prefRes = await supaAdmin(env, "communication_preferences", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ customer_id: customerId, category, allowed, updated_at: new Date().toISOString() }),
  });
  if (!prefRes.ok) return json({ error: "Could not save preference.", detail: await prefRes.text() }, 500, origin);

  await supaAdmin(env, "consent_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      customer_id: customerId,
      category,
      action: allowed ? "opt_in" : "opt_out",
      source: body.source || "cms",
      method: body.method || "admin_recorded",
      created_by: admin.email,
    }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: allowed ? "consent_opt_in" : "consent_opt_out", entity_type: "customer", entity_id: customerId, details: { category } }),
  });

  return json({ ok: true }, 200, origin);
};
