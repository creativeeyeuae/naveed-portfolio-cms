// POST /api/admin/whatsapp/cancel-connect -- the CMS "Cancel" button shown while waiting for
// or showing a QR. Clears connect_requested (so an idle bridge won't start a QR), sets status
// back to not_connected and drops the QR. If the bridge is already in its QR stage, webhook.ts
// ignores its further QR updates after a cancel, and the bridge abandons the QR on its own
// within 3 minutes (QR_TIMEOUT_MS in whatsapp-bridge/index.js) and goes back to waiting.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

const CANCELLED_MARKER = "Cancelled -- press Connect to try again.";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const rowRes = await supaAdmin(env, "whatsapp_connection?select=id,status&limit=1", { method: "GET" });
  if (!rowRes.ok) return json({ error: "Could not load connection status.", detail: await rowRes.text() }, 500, origin);
  const row = ((await rowRes.json()) as any[])?.[0];
  if (!row) return json({ ok: true }, 200, origin);
  if (row.status === "connected") return json({ error: "WhatsApp is connected -- use Disconnect instead." }, 400, origin);

  const patch = { connect_requested: false, status: "not_connected", qr_code: null, error: CANCELLED_MARKER, updated_at: new Date().toISOString() };
  const res = await supaAdmin(env, `whatsapp_connection?id=eq.${row.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  if (!res.ok) return json({ error: "Could not cancel.", detail: await res.text() }, 500, origin);
  return json({ ok: true }, 200, origin);
};
