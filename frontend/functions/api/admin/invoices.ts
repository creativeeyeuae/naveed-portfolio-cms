// GET /api/admin/invoices?status=paid
//
// Lists invoices for the CMS's Invoices tab. Invoices are auto-created/upserted whenever a
// payment is approved (see payments/[id]/approve.ts) -- this endpoint only reads them; the
// one write path below (mark-paid) exists for the rare booking settled outside the normal
// bank-transfer/PayPal flow (e.g. paid in person), so it never has an invoice otherwise.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  let path =
    "invoices?select=*,appointments(appointment_ref,service_name,package_name,booking_date,customer_id,customers(full_name,email))&order=created_at.desc&limit=500";
  if (status) path += `&status=eq.${encodeURIComponent(status)}`;

  const res = await supaAdmin(env, path, { method: "GET" });
  if (!res.ok) return json({ error: "Could not load invoices.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ invoices: rows }, 200, origin);
};
