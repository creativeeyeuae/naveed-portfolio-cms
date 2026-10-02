// POST/DELETE /api/admin/contacts/:id/tags -- attach/remove an outreach tag on a contact.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

// POST { tag_name } -- finds or creates the tag, then links it.
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const contactId = params.id as string;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tagName = String(body.tag_name || "").trim();
  if (!tagName) return json({ error: "Tag name is required." }, 400, origin);

  let tagId: string | undefined;
  const existing = await supaAdmin(env, `outreach_tags?select=*&name=eq.${encodeURIComponent(tagName)}&limit=1`, { method: "GET" });
  const existingRows = existing.ok ? ((await existing.json()) as any[]) : [];
  if (existingRows?.[0]) {
    tagId = existingRows[0].id;
  } else {
    const created = await supaAdmin(env, "outreach_tags", { method: "POST", body: JSON.stringify({ name: tagName }) });
    if (!created.ok) return json({ error: "Could not create tag.", detail: await created.text() }, 500, origin);
    tagId = ((await created.json()) as any[])?.[0]?.id;
  }

  const res = await supaAdmin(env, "outreach_contact_tags", {
    method: "POST",
    headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify({ contact_id: contactId, tag_id: tagId }),
  });
  if (!res.ok) return json({ error: "Could not attach tag.", detail: await res.text() }, 500, origin);
  return json({ ok: true, tag_id: tagId }, 200, origin);
};

// DELETE ?tag_id=... -- removes the link.
export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const contactId = params.id as string;
  const tagId = new URL(request.url).searchParams.get("tag_id");
  if (!tagId) return json({ error: "tag_id is required." }, 400, origin);

  const res = await supaAdmin(env, `outreach_contact_tags?contact_id=eq.${contactId}&tag_id=eq.${tagId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not remove tag.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
