// POST /api/admin/push/subscribe   body: { endpoint, keys: { p256dh, auth } }
//
// Called by the CMS once the admin turns on notifications in a browser. Requires the same
// real admin session as every other /api/admin/* endpoint -- see _shared/adminAuth.ts.
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
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;
  if (!endpoint || !p256dh || !auth) return json({ error: "Missing subscription details." }, 400, origin);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ endpoint, p256dh, auth, admin_email: admin.email }),
  });
  if (!res.ok) return json({ error: "Could not save subscription.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
