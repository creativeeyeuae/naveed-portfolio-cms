// GET /api/admin/tasks
//
// Every open (not completed) follow-up task across all contacts, newest due date first,
// with each customer's name/company attached -- the data the CMS's "Follow-ups" dashboard
// (Today / Overdue / Upcoming) groups client-side by comparing due_date to today.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(
    env,
    "crm_tasks?completed=eq.false&select=*,customers(id,full_name,email,company)&order=due_date.asc.nullslast&limit=500",
    { method: "GET" }
  );
  if (!res.ok) return json({ error: "Could not load tasks.", detail: await res.text() }, 500, origin);
  const tasks = await res.json();
  return json({ tasks }, 200, origin);
};
