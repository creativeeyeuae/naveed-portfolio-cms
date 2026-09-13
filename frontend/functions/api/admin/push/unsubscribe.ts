// POST /api/admin/push/unsubscribe   body: { endpoint }
import { requireAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) return json({ error: "Missing endpoint." }, 400, origin);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal",
    },
  });
  if (!res.ok) return json({ error: "Could not remove subscription.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
