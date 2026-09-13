// POST /api/admin/seo/issue
// body: { issueId: string, action: "ignore" | "reopen" }
//
// The only mutation this Phase 1 build performs on a finding: marking it ignored (e.g.
// "not relevant, don't show me again") or reopening it. No content is ever changed here --
// that is deliberate; real auto-fixes are a later, separately-reviewed step. Every change
// is written to seo_change_log so it's fully auditable and reversible.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { issueId?: string; action?: string };
  const { issueId, action } = body;
  if (!issueId || (action !== "ignore" && action !== "reopen")) {
    return json({ error: "issueId and a valid action ('ignore' or 'reopen') are required." }, 400, origin);
  }

  const curRes = await supaAdmin(env, `seo_issues?select=id,page_path,status&id=eq.${issueId}`);
  if (!curRes.ok) return json({ error: "Could not load issue." }, 500, origin);
  const [issue] = (await curRes.json()) as any[];
  if (!issue) return json({ error: "Issue not found." }, 404, origin);

  const newStatus = action === "ignore" ? "ignored" : "open";
  const patchRes = await supaAdmin(env, `seo_issues?id=eq.${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: newStatus,
      resolved_at: action === "ignore" ? new Date().toISOString() : null,
    }),
  });
  if (!patchRes.ok) return json({ error: "Could not update issue.", detail: await patchRes.text() }, 500, origin);

  await supaAdmin(env, "seo_change_log", {
    method: "POST",
    body: JSON.stringify({
      issue_id: issueId, page_path: issue.page_path, field: "status",
      old_value: issue.status, new_value: newStatus, applied_by: admin.email,
    }),
  });

  return json({ ok: true, status: newStatus }, 200, origin);
};
