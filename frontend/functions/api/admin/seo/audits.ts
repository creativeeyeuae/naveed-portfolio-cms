// GET /api/admin/seo/audits
//
// Loads the latest SEO audit run and its findings for the CMS SEO Agent dashboard.
// Requires a real admin session (see _shared/adminAuth.ts).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const latestRes = await supaAdmin(
    env,
    "seo_audits?select=*&order=started_at.desc&limit=1"
  );
  if (!latestRes.ok) return json({ error: "Could not load audits.", detail: await latestRes.text() }, 500, origin);
  const [lastAudit] = (await latestRes.json()) as any[];

  const historyRes = await supaAdmin(
    env,
    "seo_audits?select=id,started_at,finished_at,status,pages_crawled,total_issues&order=started_at.desc&limit=10"
  );
  const history = historyRes.ok ? await historyRes.json() : [];

  let issues: any[] = [];
  if (lastAudit) {
    const issuesRes = await supaAdmin(
      env,
      `seo_issues?select=*&audit_id=eq.${lastAudit.id}&order=severity.asc,detected_at.desc&limit=500`
    );
    if (issuesRes.ok) issues = await issuesRes.json();
  }

  return json({ lastAudit: lastAudit || null, issues, history }, 200, origin);
};
