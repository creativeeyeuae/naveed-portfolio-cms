// PATCH /api/admin/clients/:id/update
//
// Updates the CRM fields on one customer row (company, job title, industry, website,
// lead status, source, event met, date met). Never touches name/email/phone -- those are
// booking-flow fields owned elsewhere; this endpoint is additive CRM enrichment only.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

const ALLOWED_FIELDS = ["company", "job_title", "industry", "website", "lead_status", "source", "event_met", "date_met"] as const;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const f of ALLOWED_FIELDS) if (f in body) patch[f] = body[f];
  if (!Object.keys(patch).length) return json({ error: "Nothing to update." }, 400, origin);

  const res = await supaAdmin(env, `customers?id=eq.${customerId}`, { method: "PATCH", body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not update client.", detail: await res.text() }, 500, origin);

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "crm_contact_updated", entity_type: "customer", entity_id: customerId, details: patch }),
  });

  return json({ ok: true }, 200, origin);
};
