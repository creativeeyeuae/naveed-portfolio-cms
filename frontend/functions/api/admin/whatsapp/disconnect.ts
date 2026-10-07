// POST /api/admin/whatsapp/disconnect -- the CMS "Disconnect" button (WhatsApp > Settings).
// Admin-only (requireAdmin), unlike webhook.ts/pending.ts which are bridge-only.
//
// Does NOT talk to WhatsApp itself -- it only sets disconnect_requested=true on the single
// whatsapp_connection row (migration 0018). The bridge (whatsapp-bridge/index.js) already
// polls GET /api/whatsapp/pending every ~4s; the next time it does, it sees the flag, logs
// the current session out cleanly (sock.logout(), the same graceful unlink WhatsApp expects
// from "Linked Devices > Log out" -- not just killing the process), clears its local session
// so the following reconnect is forced to show a brand-new QR, and reports back through the
// existing webhook, which clears this flag again.
//
// This only ever flips a flag Naveed's own CMS session asked for -- it can't be triggered by
// a visitor or anything on the public site.
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

  if (!row || row.status !== "connected") {
    return json({ error: "WhatsApp isn't currently connected -- nothing to disconnect." }, 400, origin);
  }

  const patch = { disconnect_requested: true, status: "disconnecting", updated_at: new Date().toISOString() };
  const res = await supaAdmin(env, `whatsapp_connection?id=eq.${row.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return json({ error: "Could not request disconnect.", detail: await res.text() }, 500, origin);

  return json({ ok: true }, 200, origin);
};
