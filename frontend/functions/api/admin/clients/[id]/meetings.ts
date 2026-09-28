// POST /api/admin/clients/:id/meetings
//
// Adds one meeting record (event, date, location, how met, interest, notes, next action)
// to a customer -- the same fields the business-card scanner's meeting step (Phase 2) will
// also write into, so this endpoint is shared by both the manual "Add Meeting" form and the
// scanner's review screen.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

const FIELDS = ["event", "meeting_date", "location", "how_met", "interest", "notes", "next_action"] as const;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const row: Record<string, unknown> = { customer_id: customerId };
  for (const f of FIELDS) if (body[f]) row[f] = body[f];

  const res = await supaAdmin(env, "crm_meetings", { method: "POST", body: JSON.stringify(row) });
  if (!res.ok) return json({ error: "Could not save meeting.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "crm_meeting_added", entity_type: "customer", entity_id: customerId, details: { meeting_id: rows?.[0]?.id, event: row.event } }),
  });

  return json({ meeting: rows?.[0] }, 200, origin);
};
