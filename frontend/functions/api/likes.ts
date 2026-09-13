// GET  /api/likes?projectId=X        -> { count, liked }
// POST /api/likes  { projectId, action: "like"|"unlike" }  (requires a visitor session)
//
// Real, shared, deduped likes -- replaces the old localStorage-only per-browser count.
// One row per (project, visitor) with a unique constraint (project_likes), so a visitor
// can never like the same project twice; "unlike" just deletes their own row. Public
// visitor names are never exposed here -- this endpoint only ever returns a number and
// a boolean.
import { supaAdmin, json, corsHeaders } from "../_shared/adminAuth";
import { getVisitorIdFromRequest, type VisitorEnv } from "../_shared/visitorAuth";

type Env = VisitorEnv & { SUPABASE_SERVICE_ROLE_KEY: string };

async function countLikes(env: Env, projectId: string): Promise<number> {
  const res = await supaAdmin(env as any, `project_likes?project_id=eq.${encodeURIComponent(projectId)}&select=id`, {
    method: "GET",
    headers: { Prefer: "count=exact" },
  });
  const range = res.headers.get("content-range"); // e.g. "0-4/5"
  const total = range?.split("/")[1];
  return total ? parseInt(total, 10) || 0 : 0;
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const projectId = new URL(request.url).searchParams.get("projectId") || "";
  if (!projectId) return json({ error: "projectId is required." }, 400, origin);

  const visitorId = await getVisitorIdFromRequest(request, env);
  const count = await countLikes(env, projectId);
  let liked = false;
  if (visitorId) {
    const mine = await supaAdmin(
      env as any,
      `project_likes?project_id=eq.${encodeURIComponent(projectId)}&visitor_id=eq.${visitorId}&select=id`
    );
    liked = mine.ok && ((await mine.json()) as any[]).length > 0;
  }
  return json({ count, liked }, 200, origin);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ error: "Please identify yourself first.", needsIdentity: true }, 401, origin);

  const body = (await request.json().catch(() => ({}))) as { projectId?: string; action?: string };
  const { projectId, action } = body;
  if (!projectId || (action !== "like" && action !== "unlike")) {
    return json({ error: "projectId and a valid action ('like' or 'unlike') are required." }, 400, origin);
  }

  if (action === "like") {
    await supaAdmin(env as any, "project_likes?on_conflict=project_id,visitor_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({ project_id: projectId, visitor_id: visitorId }),
    });
  } else {
    await supaAdmin(
      env as any,
      `project_likes?project_id=eq.${encodeURIComponent(projectId)}&visitor_id=eq.${visitorId}`,
      { method: "DELETE" }
    );
  }

  const count = await countLikes(env, projectId);
  return json({ count, liked: action === "like" }, 200, origin);
};
