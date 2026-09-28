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

  // CRM data added by migration 0008. Each fetched independently and defaulted to an empty
  // list on failure, so this endpoint still returns the booking/message history above even
  // before that migration has been run against the real database.
  const [notesRes, meetingsRes, tasksRes, tagLinksRes, consentRes] = await Promise.all([
    supaAdmin(env, `crm_notes?customer_id=eq.${customerId}&order=created_at.desc&limit=200`, { method: "GET" }),
    supaAdmin(env, `crm_meetings?customer_id=eq.${customerId}&order=meeting_date.desc.nullslast&limit=200`, { method: "GET" }),
    supaAdmin(env, `crm_tasks?customer_id=eq.${customerId}&order=due_date.asc.nullslast&limit=200`, { method: "GET" }),
    supaAdmin(env, `customer_tags?customer_id=eq.${customerId}&select=crm_tags(id,name,slug,color)`, { method: "GET" }),
    supaAdmin(env, `communication_preferences?customer_id=eq.${customerId}&select=category,allowed,updated_at`, { method: "GET" }),
  ]);
  const notes = notesRes.ok ? await notesRes.json() : [];
  const meetings = meetingsRes.ok ? await meetingsRes.json() : [];
  const tasks = tasksRes.ok ? await tasksRes.json() : [];
  const tagLinks = tagLinksRes.ok ? ((await tagLinksRes.json()) as any[]) : [];
  const tags = tagLinks.map((t) => t.crm_tags).filter(Boolean);
  const consent = consentRes.ok ? await consentRes.json() : [];

  return json({ customer, bookings, messages, notes, meetings, tasks, tags, consent }, 200, origin);
};
