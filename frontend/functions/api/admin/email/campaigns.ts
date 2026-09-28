// GET /api/admin/email/campaigns -- list every campaign with its template name and a
// per-status recipient count, for the Campaigns dashboard.
// POST /api/admin/email/campaigns -- create a new draft campaign (name, template_id,
// category, audience). Creating a campaign never sends anything -- sending is a separate,
// explicit action (see campaigns/[id]/send.ts).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

const CATEGORIES = ["relationship", "service", "marketing", "promotions", "events", "offers", "wishes"] as const;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "email_campaigns?select=*,email_templates(name)&order=created_at.desc&limit=200", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load campaigns.", detail: await res.text() }, 500, origin);
  const campaigns = (await res.json()) as any[];

  const msgRes = await supaAdmin(env, "email_messages?select=campaign_id,status", { method: "GET" });
  const messages = msgRes.ok ? ((await msgRes.json()) as any[]) : [];
  const countsByCampaign = new Map<string, Record<string, number>>();
  for (const m of messages) {
    if (!countsByCampaign.has(m.campaign_id)) countsByCampaign.set(m.campaign_id, {});
    const c = countsByCampaign.get(m.campaign_id)!;
    c[m.status] = (c[m.status] || 0) + 1;
  }

  return json({ campaigns: campaigns.map((c) => ({ ...c, counts: countsByCampaign.get(c.id) || {} })) }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const category = String(body.category || "");
  if (!name) return json({ error: "Campaign name is required." }, 400, origin);
  if (!(CATEGORIES as readonly string[]).includes(category)) return json({ error: "Unknown communication category." }, 400, origin);
  if (!body.template_id) return json({ error: "A template must be selected." }, 400, origin);

  const audience = body.audience && typeof body.audience === "object" ? body.audience : { type: "all" };
  const res = await supaAdmin(env, "email_campaigns", {
    method: "POST",
    body: JSON.stringify({ name, template_id: body.template_id, category, audience, created_by: admin.email }),
  });
  if (!res.ok) return json({ error: "Could not create campaign.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "email_campaign_created", entity_type: "email_campaign", entity_id: rows?.[0]?.id, details: { name, category } }),
  });

  return json({ campaign: rows?.[0] }, 200, origin);
};
