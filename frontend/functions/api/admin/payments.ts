// GET /api/admin/payments?status=paid|pending|under_review|rejected
//
// A full payments LEDGER -- every payment regardless of state, for the CMS's own Payments
// tab. This is deliberately separate from GET /api/admin/bookings (which only ever needs the
// single payment attached to each booking): finance wants to see payments as their own list,
// filterable by status/method, independent of the booking workflow. Read-only; the actual
// state changes still only ever happen via payments/[id]/approve.ts and reject.ts.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const method = url.searchParams.get("method"); // paypal | bank_transfer

  let path =
    "payments?select=*,appointments(appointment_ref,booking_date,booking_time,service_name,package_name,customer_id,customers(full_name,email))&order=created_at.desc&limit=500";
  if (status) path += `&status=eq.${encodeURIComponent(status)}`;
  if (method) path += `&method=eq.${encodeURIComponent(method)}`;

  const res = await supaAdmin(env, path, { method: "GET" });
  if (!res.ok) return json({ error: "Could not load payments.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];

  for (const p of rows) {
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
      } catch {}
    }
  }

  const totals = {
    paid: rows.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.total || 0), 0),
    pending: rows.filter((p) => p.status !== "paid" && p.status !== "rejected").reduce((s, p) => s + Number(p.total || 0), 0),
    count: rows.length,
  };

  return json({ payments: rows, totals }, 200, origin);
};
