// GET /api/admin/clients/:id
//
// One client's full detail for the CMS: profile, every booking (with its payment), and their
// message thread -- everything the Clients tab's detail panel needs, in one call.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env, params }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const customerId = params.id as string;

  const custRes = await supaAdmin(env, `customers?id=eq.${customerId}&select=*`, { method: "GET" });
  const custRows = (await custRes.json()) as any[];
  const customer = custRows?.[0];
  if (!customer) return json({ error: "Client not found." }, 404, origin);

  const apptRes = await supaAdmin(
    env,
    `appointments?customer_id=eq.${customerId}&select=*,payments(*)&order=created_at.desc&limit=200`,
    { method: "GET" }
  );
  const bookings = apptRes.ok ? ((await apptRes.json()) as any[]) : [];

  const msgRes = await supaAdmin(
    env,
    `client_messages?customer_id=eq.${customerId}&order=created_at.asc&limit=200`,
    { method: "GET" }
  );
  const messages = msgRes.ok ? ((await msgRes.json()) as any[]) : [];

  return json({ customer, bookings, messages }, 200, origin);
};
