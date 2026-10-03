// GET/PATCH/DELETE /api/admin/contacts/:id
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";
import { isLegacyBase64, deleteBusinessCardImage } from "../../../_shared/businessCardStorage";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const res = await supaAdmin(env, `outreach_contacts?id=eq.${id}&select=*,outreach_companies(id,name,industry,website)&limit=1`, { method: "GET" });
  const rows = res.ok ? ((await res.json()) as any[]) : [];
  const contact = rows?.[0];
  if (!contact) return json({ error: "Contact not found." }, 404, origin);

  const tagRes = await supaAdmin(env, `outreach_contact_tags?contact_id=eq.${id}&select=outreach_tags(id,name)`, { method: "GET" });
  const tagLinks = tagRes.ok ? ((await tagRes.json()) as any[]) : [];
  contact.tags = tagLinks.map((t) => t.outreach_tags).filter(Boolean);

  return json({ contact }, 200, origin);
};

export const onRequestPatch: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = ["company_id", "first_name", "last_name", "full_name", "job_title", "email", "phone", "whatsapp", "website", "linkedin", "country", "city", "address", "notes", "card_image_url", "status", "source"];
  const fields: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) fields[k] = body[k];
  fields.updated_at = new Date().toISOString();

  const res = await supaAdmin(env, `outreach_contacts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(fields) });
  if (!res.ok) return json({ error: "Could not update contact.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ contact: rows?.[0] }, 200, origin);
};

export const onRequestDelete: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;
  const id = params.id as string;

  // Part 2B: best-effort Storage cleanup. Fetched before the delete so we still know the
  // image path afterward; never blocks the delete itself (a cleanup failure just leaves an
  // orphaned object in the private bucket -- it stays unreferenced and inaccessible, not a
  // data-loss or security issue). Legacy base64 rows have no Storage object to clean up.
  let imagePathToClean: string | null = null;
  try {
    const existingRes = await supaAdmin(env, `outreach_contacts?id=eq.${id}&select=card_image_url&limit=1`, { method: "GET" });
    const existingRows = existingRes.ok ? ((await existingRes.json()) as any[]) : [];
    const existingImage = existingRows?.[0]?.card_image_url as string | null | undefined;
    if (existingImage && !isLegacyBase64(existingImage)) imagePathToClean = existingImage;
  } catch {}

  const res = await supaAdmin(env, `outreach_contacts?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res.ok) return json({ error: "Could not delete contact.", detail: await res.text() }, 500, origin);

  if (imagePathToClean) {
    try {
      await deleteBusinessCardImage(env, imagePathToClean);
    } catch {}
  }

  return json({ ok: true }, 200, origin);
};
