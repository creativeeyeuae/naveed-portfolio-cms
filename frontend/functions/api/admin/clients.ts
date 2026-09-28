// GET /api/admin/clients
//
// Client directory for the CMS -- every row in `customers`, enriched with a booking count
// and lifetime paid total computed here (derived from the existing appointments list), plus
// -- since migration 0008 -- each customer's CRM tags, for the tag chips shown in the list.
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

  // Tags per customer -- a table that may not exist yet if migration 0008 hasn't been run,
  // so a failed/empty response here just means no tags show up yet, never an error.
  const tagRes = await supaAdmin(env, "customer_tags?select=customer_id,crm_tags(id,name,slug,color)", { method: "GET" });
  const tagLinks = tagRes.ok ? ((await tagRes.json()) as any[]) : [];
  const tagsByCustomer = new Map<string, any[]>();
  for (const t of tagLinks) {
    if (!t.customer_id || !t.crm_tags) continue;
    if (!tagsByCustomer.has(t.customer_id)) tagsByCustomer.set(t.customer_id, []);
    tagsByCustomer.get(t.customer_id)!.push(t.crm_tags);
  }

  const clients = customers.map((c) => {
    const bookings = byCustomer.get(c.id) || [];
    const lifetimeTotal = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + Number(b.total || 0), 0);
    const lastBooking = bookings[0]?.booking_date || null;
    return { ...c, booking_count: bookings.length, lifetime_total: lifetimeTotal, last_booking_date: lastBooking, tags: tagsByCustomer.get(c.id) || [] };
  });

  return json({ clients }, 200, origin);
};

// POST /api/admin/clients -- creates a new contact directly in the CRM (not from a booking).
// Used by the "Add Contact" button and, in Phase 2, the business-card scanner's confirm
// step. Always checks for an existing customer with the same phone/whatsapp/email FIRST and
// returns it instead of creating a duplicate -- the caller decides whether to update that
// existing record or proceed anyway.
export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = String(body.full_name || "").trim();
  if (!fullName) return json({ error: "Name is required." }, 400, origin);
  const email = body.email ? String(body.email).trim() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const whatsapp = body.whatsapp ? String(body.whatsapp).trim() : null;

  if (!body.force && (email || phone || whatsapp)) {
    const filters: string[] = [];
    if (email) filters.push(`email.eq.${encodeURIComponent(email)}`);
    if (phone) filters.push(`phone.eq.${encodeURIComponent(phone)}`);
    if (whatsapp) filters.push(`whatsapp.eq.${encodeURIComponent(whatsapp)}`);
    const dupRes = await supaAdmin(env, `customers?or=(${filters.join(",")})&select=*&limit=1`, { method: "GET" });
    const dupRows = dupRes.ok ? ((await dupRes.json()) as any[]) : [];
    if (dupRows?.[0]) return json({ duplicate: dupRows[0] }, 409, origin);
  }

  const row: Record<string, unknown> = {
    full_name: fullName,
    email,
    phone,
    whatsapp,
    company: body.company || null,
    job_title: body.job_title || null,
    industry: body.industry || null,
    website: body.website || null,
    source: body.source || null,
    event_met: body.event_met || null,
    date_met: body.date_met || null,
  };
  const res = await supaAdmin(env, "customers", { method: "POST", body: JSON.stringify(row) });
  if (!res.ok) return json({ error: "Could not create contact.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  const created = rows?.[0];

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor: `admin:${admin.email}`, action: "crm_contact_created", entity_type: "customer", entity_id: created?.id, details: { source: body.source || "manual" } }),
  });

  return json({ client: created }, 200, origin);
};
