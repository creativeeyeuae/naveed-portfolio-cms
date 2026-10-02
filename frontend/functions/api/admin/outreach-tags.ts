// GET/POST /api/admin/outreach-tags -- reusable tags for the outreach Companies/Contacts
// database. Deliberately separate from crm-tags.ts (the Creative Fusion CRM's own tags),
// per instruction: this feature must not be mixed with that CRM.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "outreach_tags?select=*&order=name.asc&limit=500", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load tags.", detail: await res.text() }, 500, origin);
  return json({ tags: await res.json() }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  if (!name) return json({ error: "Tag name is required." }, 400, origin);

  const existing = await supaAdmin(env, `outreach_tags?select=*&name=eq.${encodeURIComponent(name)}&limit=1`, { method: "GET" });
  const existingRows = existing.ok ? ((await existing.json()) as any[]) : [];
  if (existingRows?.[0]) return json({ tag: existingRows[0] }, 200, origin);

  const res = await supaAdmin(env, "outreach_tags", { method: "POST", body: JSON.stringify({ name }) });
  if (!res.ok) return json({ error: "Could not create tag.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ tag: rows?.[0] }, 200, origin);
};
