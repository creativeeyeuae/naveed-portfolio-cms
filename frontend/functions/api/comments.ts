// GET  /api/comments?projectId=X   -> approved comments only: [{id, name, comment, createdAt}]
// POST /api/comments  { projectId, comment }  (requires a visitor session)
//
// Real, moderated comments. A submitted comment always starts 'pending' and is invisible
// to the public until an admin approves it in the CMS (functions/api/admin/comments.ts).
// Email/WhatsApp are never selected/returned here -- only the visitor's name.
import { supaAdmin, json, corsHeaders } from "../_shared/adminAuth";
import { getVisitorIdFromRequest, type VisitorEnv } from "../_shared/visitorAuth";

type Env = VisitorEnv & { SUPABASE_SERVICE_ROLE_KEY: string };
const MAX_COMMENT_LEN = 1000;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const projectId = new URL(request.url).searchParams.get("projectId") || "";
  if (!projectId) return json({ error: "projectId is required." }, 400, origin);

  const res = await supaAdmin(
    env as any,
    `project_comments?project_id=eq.${encodeURIComponent(projectId)}&status=eq.approved&select=id,comment,created_at,visitors(name)&order=created_at.desc`
  );
  if (!res.ok) return json({ comments: [] }, 200, origin);
  const rows = (await res.json()) as any[];
  const comments = rows.map((r) => ({ id: r.id, name: r.visitors?.name || "Guest", comment: r.comment, createdAt: r.created_at }));
  return json({ comments }, 200, origin);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ error: "Please identify yourself first.", needsIdentity: true }, 401, origin);

  const body = (await request.json().catch(() => ({}))) as { projectId?: string; comment?: string };
  const projectId = (body.projectId || "").trim();
  const comment = (body.comment || "").trim();
  if (!projectId || !comment) return json({ error: "projectId and comment are required." }, 400, origin);
  if (comment.length > MAX_COMMENT_LEN) return json({ error: "Comment is too long." }, 400, origin);

  const res = await supaAdmin(env as any, "project_comments", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, visitor_id: visitorId, comment, status: "pending" }),
  });
  if (!res.ok) return json({ error: "Could not save your comment." }, 500, origin);
  return json({ ok: true, pendingReview: true }, 200, origin);
};
