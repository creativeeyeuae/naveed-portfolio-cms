// GET /api/visitor/me -- lets the frontend check "is this browser already identified"
// without ever exposing the visitor's email/whatsapp back to client JS -- only their
// name (safe to show, e.g. "Signed in as Jane" on the like/comment box) and whether a
// session exists at all.
import { supaAdmin, json, corsHeaders } from "../../_shared/adminAuth";
import { getVisitorIdFromRequest, type VisitorEnv } from "../../_shared/visitorAuth";

type Env = VisitorEnv & { SUPABASE_SERVICE_ROLE_KEY: string };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ signedIn: false }, 200, origin);

  const res = await supaAdmin(env as any, `visitors?select=name&id=eq.${visitorId}`);
  const [visitor] = res.ok ? ((await res.json()) as { name: string }[]) : [];
  if (!visitor) return json({ signedIn: false }, 200, origin);
  return json({ signedIn: true, name: visitor.name }, 200, origin);
};
