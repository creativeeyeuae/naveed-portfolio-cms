// GET /api/admin/bookings?status=pending_verification
//
// Lists appointments (joined with their customer + payment) for the admin Bookings tab.
// Requires a real Supabase Auth admin session (see _shared/adminAuth.ts) -- the public anon
// key used by the rest of the site has no SELECT access to these tables at all, by design.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const status = url.searchParams.get("status"); // optional filter, e.g. pending_verification

  let path =
    "appointments?select=*,customers(full_name,email,phone,whatsapp,company),payments(*)&order=created_at.desc&limit=200";
  if (status) path += `&status=eq.${encodeURIComponent(status)}`;

  const res = await supaAdmin(env, path, { method: "GET" });
  if (!res.ok) {
    const t = await res.text();
    return json({ error: "Could not load bookings.", detail: t }, 500, origin);
  }
  const rows = (await res.json()) as any[];

  // Live stage (started / on hold) set by bookings/[id]/update.ts -- latest entry wins.
  try {
    const ids = rows.map((r) => r.id).filter(Boolean);
    if (ids.length) {
      const st = await supaAdmin(env, `audit_log?action=eq.booking_stage&entity_id=in.(${ids.join(",")})&select=entity_id,details,created_at&order=created_at.desc&limit=2000`, { method: "GET" });
      const seen = new Set<string>();
      for (const s of st.ok ? ((await st.json()) as any[]) : []) {
        if (seen.has(s.entity_id)) continue; seen.add(s.entity_id);
        const row = rows.find((r) => r.id === s.entity_id);
        if (row && s.details?.stage) { row.stage = s.details.stage; row.stage_reason = s.details.reason || ""; row.stage_note = s.details.note || ""; row.stage_at = s.created_at; }
      }
    }
  } catch {}

  // For any payment with a receipt on file, mint a short-lived signed URL so the admin can
  // view it -- the receipts bucket has no public/anon read access at all, on purpose.
  for (const row of rows) {
    for (const p of row.payments || []) {
      if (p.receipt_path) {
        try {
          const signRes = await fetch(
            `https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1/object/sign/receipts/${p.receipt_path}`,
            {
              method: "POST",
              headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ expiresIn: 600 }),
            }
          );
          if (signRes.ok) {
            const { signedURL } = (await signRes.json()) as { signedURL: string };
            p.receipt_signed_url = `https://ziwaocjrpbrksnepbpxi.supabase.co/storage/v1${signedURL}`;
          }
        } catch {
          // If signing fails for one receipt, just omit its URL rather than failing the list.
        }
      }
    }
  }

  return json({ bookings: rows }, 200, origin);
};
