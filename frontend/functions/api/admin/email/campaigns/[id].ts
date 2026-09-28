// GET /api/admin/email/campaigns/:id -- one campaign plus its full per-recipient send
// history (real delivery status only -- never fabricated).
// DELETE /api/admin/email/campaigns/:id -- removes a draft campaign that hasn't sent yet.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const cRes = await supaAdmin(env, `email_campaigns?id=eq.${params.id}&select=*,email_templates(id,name,subject)`, { method: "GET" });
  const campaign = ((await cRes.json()) as any[])?.[0];
  if (!campaign) return json({ error: "Campaign not found." }, 404, origin);

  const mRes = await supaAdmin(
    env,
    `email_messages?campaign_id=eq.${params.id}&select=*,customers(full_name,email)&order=created_at.asc&limit=2000`,
    { method: "GET" }
  );
  const messages = mRes.ok ? await mRes.json() : [];

  return json({ campaign, messages }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const cRes = await supaAdmin(env, `email_campaigns?id=eq.${params.id}&select=status`, { method: "GET" });
  const campaign = ((await cRes.json()) as any[])?.[0];
  if (!campaign) return json({ error: "Campaign not found." }, 404, origin);
  if (campaign.status !== "draft") return json({ error: "Only a draft campaign can be deleted." }, 409, origin);

  const res = await supaAdmin(env, `email_campaigns?id=eq.${params.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete campaign.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
