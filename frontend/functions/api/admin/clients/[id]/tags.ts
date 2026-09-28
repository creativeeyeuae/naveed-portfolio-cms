// POST /api/admin/clients/:id/tags -- attach a tag by name (creates the tag if it's new).
// DELETE /api/admin/clients/:id/tags?tag_id=... -- detach one tag.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = (body.name || "").trim();
  if (!name) return json({ error: "Tag name is required." }, 400, origin);
  const slug = slugify(name);
  if (!slug) return json({ error: "Invalid tag name." }, 400, origin);

  // Find-or-create the tag by slug (merge-duplicates so a repeat name is a harmless no-op).
  const tagRes = await supaAdmin(env, "crm_tags", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ name, slug }),
  });
  if (!tagRes.ok) return json({ error: "Could not save tag.", detail: await tagRes.text() }, 500, origin);
  const tagRows = (await tagRes.json()) as any[];
  let tag = tagRows?.[0];
  if (!tag) {
    const findRes = await supaAdmin(env, `crm_tags?slug=eq.${slug}&select=*`, { method: "GET" });
    tag = ((await findRes.json()) as any[])?.[0];
  }
  if (!tag) return json({ error: "Could not resolve tag." }, 500, origin);

  const linkRes = await supaAdmin(env, "customer_tags", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ customer_id: customerId, tag_id: tag.id }),
  });
  if (!linkRes.ok) return json({ error: "Could not attach tag.", detail: await linkRes.text() }, 500, origin);

  return json({ tag }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;
  const url = new URL(request.url);
  const tagId = url.searchParams.get("tag_id");
  if (!tagId) return json({ error: "tag_id is required." }, 400, origin);

  const res = await supaAdmin(env, `customer_tags?customer_id=eq.${customerId}&tag_id=eq.${tagId}`, { method: "DELETE" });
  if (!res.ok) return json({ error: "Could not remove tag.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
