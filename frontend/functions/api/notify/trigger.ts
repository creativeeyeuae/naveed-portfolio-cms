// POST /api/notify/trigger   body: { type: "new_booking" | "receipt_uploaded" | "new_lead", id: string }
//
// Called by the PUBLIC site right after a real, successful write (booking created, receipt
// uploaded, contact form submitted) to alert the admin via push. Deliberately has no admin
// auth -- the visitor who just booked isn't the admin -- but it never trusts the caller for
// notification CONTENT: every message is built here from a fresh, real lookup of the row by
// id using the service-role key, and only sent if that row is real and recent. A caller can
// only ever re-trigger a push about something that genuinely just happened, never invent one.
import { json, corsHeaders } from "../../_shared/adminAuth";
import { notifyAllAdmins, type PushEnv } from "../../_shared/webpush";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
const RECENT_MS = 15 * 60 * 1000;

function isRecent(iso: string | undefined | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t < RECENT_MS;
}

function supa(env: PushEnv, path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<PushEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const type = body?.type as string | undefined;
  const id = body?.id as string | undefined;
  if (!type || !id) return json({ error: "Missing type or id." }, 400, origin);

  let payload: { title: string; body: string; url?: string } | null = null;

  try {
    if (type === "new_booking") {
      const res = await supa(env, `appointments?id=eq.${id}&select=appointment_ref,service_name,package_name,created_at,customers(full_name)`);
      const row = (await res.json())?.[0];
      if (row && isRecent(row.created_at)) {
        payload = {
          title: "New booking received",
          body: `${row.appointment_ref} — ${row.service_name} (${row.package_name}) from ${row.customers?.full_name || "a client"}`,
          url: "/?admin=1",
        };
      }
    } else if (type === "receipt_uploaded") {
      const res = await supa(env, `payments?appointment_id=eq.${id}&select=total,uploaded_at,appointments(appointment_ref)`);
      const row = (await res.json())?.[0];
      if (row && isRecent(row.uploaded_at)) {
        payload = {
          title: "Payment receipt awaiting review",
          body: `${row.appointments?.appointment_ref || "A booking"} — AED ${row.total} needs verification`,
          url: "/?admin=1",
        };
      }
    } else if (type === "new_lead") {
      const res = await supa(env, `site_settings?key=eq.nap_contact_submissions&select=value`);
      const row = (await res.json())?.[0];
      const list = row ? JSON.parse(row.value || "[]") : [];
      const lead = Array.isArray(list) ? list.find((l: any) => l.id === id) : null;
      if (lead && isRecent(lead.date)) {
        payload = {
          title: "New contact message",
          body: `${lead.name}${lead.subject ? " — " + lead.subject : ""}`,
          url: "/?admin=1",
        };
      }
    }
  } catch {
    return json({ ok: true, skipped: true }, 200, origin);
  }

  if (!payload) return json({ ok: true, skipped: true }, 200, origin); // nothing real/recent to notify -- not an error
  await notifyAllAdmins(env, payload);
  return json({ ok: true }, 200, origin);
};
