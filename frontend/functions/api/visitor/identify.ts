// POST /api/visitor/identify   body: { name, email, whatsapp }
//
// The one-time-per-browser "signup" for likes/comments/permission requests -- no
// password, exactly per spec. Upserts a real row in the new `visitors` table (by
// email) using the service-role key server-side, then hands the browser back a
// signed, HttpOnly session cookie (see _shared/visitorAuth.ts) identifying that row.
// Never touches the existing admin Supabase Auth.
import { supaAdmin, json, corsHeaders } from "../../_shared/adminAuth";
import { signVisitorToken, buildVisitorSetCookie, type VisitorEnv } from "../../_shared/visitorAuth";

type Env = VisitorEnv & { SUPABASE_SERVICE_ROLE_KEY: string };

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const body = (await request.json().catch(() => ({}))) as { name?: string; email?: string; whatsapp?: string };
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const whatsapp = (body.whatsapp || "").trim();
  if (!name || !email || !whatsapp) {
    return json({ error: "Name, email and WhatsApp number are all required." }, 400, origin);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400, origin);
  }

  const res = await supaAdmin(env as any, "visitors?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ name, email, whatsapp, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) return json({ error: "Could not save your details.", detail: await res.text() }, 500, origin);
  const [visitor] = (await res.json()) as { id: string; name: string }[];
  if (!visitor) return json({ error: "Could not save your details." }, 500, origin);

  const token = await signVisitorToken(env, visitor.id);
  return new Response(JSON.stringify({ ok: true, name: visitor.name }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": buildVisitorSetCookie(token), ...corsHeaders(origin) },
  });
};
