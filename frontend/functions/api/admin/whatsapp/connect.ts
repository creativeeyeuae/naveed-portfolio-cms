// POST /api/admin/whatsapp/connect -- the CMS "Connect" button (WhatsApp > Settings).
// Admin-only. Sets connect_requested=true (migration 0020). The bridge, while idle and not
// linked, checks GET /api/whatsapp/pending once a minute; when it sees this flag it starts a
// fresh session and reports a QR code through the webhook, which also clears the flag.
// The bridge never generates a QR on its own -- only after this button is pressed.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const rowRes = await supaAdmin(env, "whatsapp_connection?select=id,status&limit=1", { method: "GET" });
  if (!rowRes.ok) return json({ error: "Could not load connection status.", detail: await rowRes.text() }, 500, origin);
  const row = ((await rowRes.json()) as any[])?.[0];

  if (row && row.status === "connected") {
    return json({ error: "WhatsApp is already connected." }, 400, origin);
  }

  const patch = {
    connect_requested: true,
    status: "connecting",
    qr_code: null,
    error: "Waiting for the bridge to create a QR code -- this can take up to 1 minute…",
    updated_at: new Date().toISOString(),
  };
  const res = row
    ? await supaAdmin(env, `whatsapp_connection?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) })
    : await supaAdmin(env, "whatsapp_connection", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not request connect.", detail: await res.text() }, 500, origin);

  return json({ ok: true }, 200, origin);
};
