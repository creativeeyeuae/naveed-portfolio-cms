// GET /api/admin/whatsapp/quick-replies -- list every saved canned response.
// POST /api/admin/whatsapp/quick-replies -- save a new one (title, body, category?).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "whatsapp_quick_replies?select=*&order=title.asc&limit=300", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load quick replies.", detail: await res.text() }, 500, origin);
  return json({ quick_replies: await res.json() }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { title?: string; body?: string; category?: string };
  const title = (body.title || "").trim();
  const text = (body.body || "").trim();
  if (!title || !text) return json({ error: "A title and body are required." }, 400, origin);

  const res = await supaAdmin(env, "whatsapp_quick_replies", {
    method: "POST",
    body: JSON.stringify({ title, body: text, category: body.category || null, created_by: admin.email }),
  });
  if (!res.ok) return json({ error: "Could not save quick reply.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ quick_reply: rows?.[0] }, 200, origin);
};
