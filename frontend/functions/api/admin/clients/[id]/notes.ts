// POST /api/admin/clients/:id/notes
//
// Adds one free-text note to a customer's CRM timeline (crm_notes). Notes are never
// edited or deleted through this endpoint -- an append-only history of what was written
// and when, same spirit as the client message threads.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body.body || "").trim();
  if (!text) return json({ error: "Note text is required." }, 400, origin);

  const res = await supaAdmin(env, "crm_notes", {
    method: "POST",
    body: JSON.stringify({ customer_id: customerId, body: text, created_by: admin.email }),
  });
  if (!res.ok) return json({ error: "Could not save note.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "crm_note_added", entity_type: "customer", entity_id: customerId, details: { note_id: rows?.[0]?.id } }),
  });

  return json({ note: rows?.[0] }, 200, origin);
};
