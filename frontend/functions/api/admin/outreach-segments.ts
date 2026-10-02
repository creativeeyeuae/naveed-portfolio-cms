// GET/POST /api/admin/outreach-segments -- saved filters for companies/contacts, reusable later by campaigns.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const entityType = new URL(request.url).searchParams.get("entity_type");
  let path = "outreach_segments?select=*&order=created_at.desc&limit=500";
  if (entityType) path += `&entity_type=eq.${encodeURIComponent(entityType)}`;

  const res = await supaAdmin(env, path, { method: "GET" });
  const segments = res.ok ? await res.json() : [];
  return json({ segments }, 200, origin);
};

// POST { name, entity_type, filters } -- creates a saved segment.
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const entityType = String(body.entity_type || "").trim();
  if (!name) return json({ error: "Segment name is required." }, 400, origin);
  if (entityType !== "company" && entityType !== "contact") {
    return json({ error: "entity_type must be 'company' or 'contact'." }, 400, origin);
  }

  const res = await supaAdmin(env, "outreach_segments", {
    method: "POST",
    body: JSON.stringify({
      name,
      entity_type: entityType,
      filters: body.filters && typeof body.filters === "object" ? body.filters : {},
      created_by: admin.email || null,
    }),
  });
  if (!res.ok) return json({ error: "Could not create segment.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ segment: rows?.[0] }, 200, origin);
};
