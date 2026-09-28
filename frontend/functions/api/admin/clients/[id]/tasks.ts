// POST /api/admin/clients/:id/tasks
//
// Adds one follow-up task for a customer. Listing/completing tasks is handled by the
// cross-customer /api/admin/tasks(.ts) and /api/admin/tasks/:id/complete.ts endpoints
// (a follow-up dashboard needs every contact's tasks together, not one at a time).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as { title?: string; due_date?: string; assigned_to?: string; notes?: string };
  const title = (body.title || "").trim();
  if (!title) return json({ error: "Task title is required." }, 400, origin);

  const res = await supaAdmin(env, "crm_tasks", {
    method: "POST",
    body: JSON.stringify({ customer_id: customerId, title, due_date: body.due_date || null, assigned_to: body.assigned_to || null, notes: body.notes || null }),
  });
  if (!res.ok) return json({ error: "Could not save task.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "crm_task_added", entity_type: "customer", entity_id: customerId, details: { task_id: rows?.[0]?.id, title } }),
  });

  return json({ task: rows?.[0] }, 200, origin);
};
