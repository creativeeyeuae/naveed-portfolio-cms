// POST /api/admin/tasks/:id/complete -- marks one follow-up task done.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const taskId = params.id as string;
  const res = await supaAdmin(env, `crm_tasks?id=eq.${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ completed: true, completed_at: new Date().toISOString() }),
  });
  if (!res.ok) return json({ error: "Could not complete task.", detail: await res.text() }, 500, origin);

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "crm_task_completed", entity_type: "crm_task", entity_id: taskId, details: {} }),
  });

  return json({ ok: true }, 200, origin);
};
