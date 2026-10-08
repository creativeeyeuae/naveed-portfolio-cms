// POST /api/visitor/end-chat
//
// The Live Chat widget's "End chat" action (distinct from just closing/minimizing the
// panel, which keeps the same conversation). This clears this browser's visitor session
// cookie so the NEXT message from this browser starts a completely new, unidentified
// visitor -- asked for name/WhatsApp/email again, with no memory of the old conversation
// in the widget. Nothing is deleted: the old visitor row and every message already saved
// stay exactly as they are in the CMS/Supabase for Naveed to see; this only affects which
// cookie this one browser is currently carrying.
import { corsHeaders } from "../../_shared/adminAuth";
import { buildVisitorClearCookie } from "../../_shared/visitorAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction = async ({ request }) => {
  const origin = request.headers.get("Origin");
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": buildVisitorClearCookie(), ...corsHeaders(origin) },
  });
};
