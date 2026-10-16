// PATCH/DELETE /api/admin/email-schedules/:id
//   PATCH { action: "pause" | "resume" | "run_now" }
//   DELETE -- removes the schedule (emails already sent stay in the campaign history).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;
  const b = (await request.json().catch(() => ({}))) as Record<string, any>;
  let fields: Record<string, unknown>;
  if (b.action === "pause") fields = { status: "paused" };
  else if (b.action === "resume") fields = { status: "active", last_note: null };
  else if (b.action === "run_now") fields = { status: "active", next_run_at: new Date().toISOString(), locked_until: null };
  else return json({ error: "Unknown action." }, 400, origin);
  const r = await supaAdmin(env, `email_schedules?id=eq.${id}&status=neq.done`, { method: "PATCH", body: JSON.stringify(fields) });
  if (!r.ok) return json({ error: "Could not update the schedule.", detail: await r.text() }, 500, origin);
  return json({ schedule: ((await r.json()) as any[])?.[0] || null }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;
  const r = await supaAdmin(env, `email_schedules?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!r.ok) return json({ error: "Could not delete the schedule.", detail: await r.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
