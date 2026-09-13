// GET  /api/admin/comments                       -> every comment, any status, with
//                                                     visitor name+email for moderation context
// POST /api/admin/comments  { commentId, action: "approve"|"hide"|"delete" }
//
// Admin-only moderation, same requireAdmin/supaAdmin pattern as every other admin
// function in this folder. "delete" here is a soft delete (status='deleted') so the
// audit trail (who commented what, when) is never actually destroyed -- only the
// approved/pending/hidden/deleted STATUS controls what the public ever sees.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(
    env,
    "project_comments?select=id,project_id,comment,status,created_at,visitors(name,email)&order=created_at.desc&limit=500"
  );
  if (!res.ok) return json({ error: "Could not load comments." }, 500, origin);
  const rows = (await res.json()) as any[];
  const comments = rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    comment: r.comment,
    status: r.status,
    createdAt: r.created_at,
    visitorName: r.visitors?.name || "Guest",
    visitorEmail: r.visitors?.email || "",
  }));
  return json({ comments }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { commentId?: string; action?: string };
  const { commentId, action } = body;
  if (!commentId || !["approve", "hide", "delete"].includes(action || "")) {
    return json({ error: "commentId and a valid action are required." }, 400, origin);
  }
  const status = action === "approve" ? "approved" : action === "hide" ? "hidden" : "deleted";
  const res = await supaAdmin(env, `project_comments?id=eq.${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, moderated_at: new Date().toISOString(), moderated_by: admin.email }),
  });
  if (!res.ok) return json({ error: "Could not update comment." }, 500, origin);
  return json({ ok: true, status }, 200, origin);
};
