// POST /api/admin/invoices/:id/mark-paid
//
// For the rare booking settled outside the normal bank-transfer/PayPal flow (e.g. paid in
// person or by cash) -- marks that one invoice paid directly. The normal path (approving a
// bank-transfer receipt) already does this automatically via payments/[id]/approve.ts; this
// endpoint is only for when there is no receipt to approve in the first place.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const invoiceId = params.id as string;

  const getRes = await supaAdmin(env, `invoices?id=eq.${invoiceId}&select=*`, { method: "GET" });
  const rows = (await getRes.json()) as any[];
  const invoice = rows?.[0];
  if (!invoice) return json({ error: "Invoice not found." }, 404, origin);
  if (invoice.status === "paid") return json({ error: "Already paid." }, 409, origin);

  // Only touching columns confirmed live in payments/[id]/approve.ts's own invoice upsert --
  // no updated_at here since that column's presence on `invoices` isn't confirmed.
  const patchRes = await supaAdmin(env, `invoices?id=eq.${invoiceId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paid", payment_status: "paid" }),
  });
  if (!patchRes.ok) return json({ error: "Could not update invoice.", detail: await patchRes.text() }, 500, origin);

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "invoice_marked_paid",
      entity_type: "invoice",
      entity_id: invoiceId,
      details: { appointment_id: invoice.appointment_id, total: invoice.total },
    }),
  });

  return json({ ok: true }, 200, origin);
};
