// GET /api/admin/clients
//
// Client directory for the CMS -- every row in `customers`, enriched with a booking count
// and lifetime paid total computed here (no new table/columns: derived from the existing
// appointments list, same tables every other admin endpoint already reads).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const custRes = await supaAdmin(env, "customers?select=*&order=created_at.desc&limit=500", { method: "GET" });
  if (!custRes.ok) return json({ error: "Could not load clients.", detail: await custRes.text() }, 500, origin);
  const customers = (await custRes.json()) as any[];

  const apptRes = await supaAdmin(
    env,
    "appointments?select=customer_id,total,status,booking_date,created_at&order=created_at.desc&limit=2000",
    { method: "GET" }
  );
  const appointments = apptRes.ok ? ((await apptRes.json()) as any[]) : [];

  const byCustomer = new Map<string, any[]>();
  for (const a of appointments) {
    if (!a.customer_id) continue;
    if (!byCustomer.has(a.customer_id)) byCustomer.set(a.customer_id, []);
    byCustomer.get(a.customer_id)!.push(a);
  }

  const clients = customers.map((c) => {
    const bookings = byCustomer.get(c.id) || [];
    const lifetimeTotal = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + Number(b.total || 0), 0);
    const lastBooking = bookings[0]?.booking_date || null;
    return { ...c, booking_count: bookings.length, lifetime_total: lifetimeTotal, last_booking_date: lastBooking };
  });

  return json({ clients }, 200, origin);
};
