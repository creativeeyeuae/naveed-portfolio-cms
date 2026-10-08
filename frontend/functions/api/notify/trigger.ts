// POST /api/notify/trigger   body: { type: "new_booking" | "receipt_uploaded" | "new_lead" |
//        "permission_request", id: string }
//
// Called by the PUBLIC site right after a real, successful write (booking created, receipt
// uploaded, contact form submitted, image permission request submitted) to alert the admin
// via push. Deliberately has no admin auth -- the visitor who just acted isn't the admin --
// but it never trusts the caller for notification CONTENT: every message is built here from
// a fresh, real lookup of the row by id using the service-role key, and only sent if that row
// is real and recent. A caller can only ever re-trigger a push about something that genuinely
// just happened, never invent one.
//
// For "new_booking" and "new_lead" specifically, this also forwards a WhatsApp message to
// Naveed's dedicated alerts-only number (see _shared/liveChatWhatsapp.ts) in addition to the
// push notification -- same trusted, re-verified data, just a second delivery channel. The
// website write this call
// reports on has already fully succeeded before this function is ever called (the caller
// fires this fire-and-forget right after its own save, see HomeClient.tsx's notifyServer()
// and cmsData.ts's submitContactLead()), so a WhatsApp/VPS outage can never affect whether a
// booking or inquiry gets saved -- it only affects whether this extra WhatsApp alert goes out,
// and that failure is swallowed here so it can never break the push notification either.
import { json, corsHeaders } from "../../_shared/adminAuth";
import { notifyAllAdmins, type PushEnv } from "../../_shared/webpush";
import { forwardAdminAlertsWhatsApp, forwardClientWhatsAppAlert } from "../../_shared/liveChatWhatsapp";

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
  let waText: string | null = null; // set alongside payload for new_booking/new_lead only
  let clientWaText: string | null = null; // set alongside payload for new_booking only
  let clientWaPhone: string | null = null;
  let clientWaName: string | undefined;

  try {
    if (type === "new_booking") {
      const res = await supa(
        env,
        `appointments?id=eq.${id}&select=appointment_ref,service_name,package_name,booking_date,booking_time,total,currency,notes,created_at,customers(full_name,email,phone,whatsapp)`
      );
      const row = (await res.json())?.[0];
      if (row && isRecent(row.created_at)) {
        payload = {
          title: "New booking received",
          body: `${row.appointment_ref} — ${row.service_name} (${row.package_name}) from ${row.customers?.full_name || "a client"}`,
          url: "/?admin=1",
        };
        waText =
          `🔔 NEW BOOKING — Naveed Anjum\n\n` +
          `👤 Name: ${row.customers?.full_name || "-"}\n` +
          `📱 WhatsApp: ${row.customers?.whatsapp || row.customers?.phone || "-"}\n` +
          `📧 Email: ${row.customers?.email || "-"}\n` +
          `🎯 Service: ${row.service_name}${row.package_name ? ` (${row.package_name})` : ""}\n` +
          `📅 Date: ${row.booking_date || "-"}\n` +
          `🕐 Time: ${row.booking_time || "-"}\n` +
          `💰 Total: ${row.currency || ""} ${row.total ?? "-"}\n` +
          `📝 Notes: ${row.notes || "-"}\n` +
          `Ref: ${row.appointment_ref}\n\n` +
          `🔗 Open in CMS: https://bynaveedanjum.com/?admin=1`;

        // Also confirm receipt of the booking straight to the CLIENT's own WhatsApp --
        // same trusted, re-verified data, just a second recipient. Best-effort: if the
        // client has no WhatsApp/phone on file this is simply skipped below.
        clientWaPhone = row.customers?.whatsapp || row.customers?.phone || null;
        clientWaName = row.customers?.full_name;
        clientWaText =
          `✅ Hi ${row.customers?.full_name || ""}, we've received your booking!\n\n` +
          `🎯 Service: ${row.service_name}${row.package_name ? ` (${row.package_name})` : ""}\n` +
          `📅 Date: ${row.booking_date || "-"}\n` +
          `🕐 Time: ${row.booking_time || "-"}\n` +
          `Ref: ${row.appointment_ref}\n\n` +
          `Naveed will confirm shortly. Thank you for booking with Naveed Anjum! 📸`;
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
        waText =
          `🔔 NEW INQUIRY — Naveed Anjum\n\n` +
          `👤 Name: ${lead.name || "-"}\n` +
          `📱 Phone: ${lead.phone || "-"}\n` +
          `📧 Email: ${lead.email || "-"}\n` +
          `🎯 Category: ${lead.subject || "-"}${lead.projectType ? " / " + lead.projectType : ""}\n` +
          `📝 Message: ${lead.message || "-"}\n\n` +
          `🔗 Open in CMS: https://bynaveedanjum.com/?admin=1`;
      }
    } else if (type === "permission_request") {
      const res = await supa(env, `image_permission_requests?id=eq.${id}&select=requester_name,project_name_snapshot,created_at`);
      const row = (await res.json())?.[0];
      if (row && isRecent(row.created_at)) {
        payload = {
          title: "New image permission request",
          body: `${row.requester_name} requested permission — ${row.project_name_snapshot || "a project image"}`,
          url: "/?admin=1",
        };
      }
    }
  } catch {
    return json({ ok: true, skipped: true }, 200, origin);
  }

  if (!payload) return json({ ok: true, skipped: true }, 200, origin); // nothing real/recent to notify -- not an error

  // Second delivery channel for new_booking/new_lead -- sent to Naveed's dedicated
  // alerts-only number (see liveChatWhatsapp.ts), not the main client-facing number.
  // Best-effort, never allowed to affect the push notification below or the response (the
  // website write already fully succeeded before this endpoint was ever called).
  if (waText) {
    try {
      await forwardAdminAlertsWhatsApp(env, waText);
    } catch {}
  }

  // Third delivery channel, new_booking only: confirm receipt straight to the CLIENT's own
  // WhatsApp. Same best-effort rule -- never affects the push notification or the response.
  if (clientWaText && clientWaPhone) {
    try {
      await forwardClientWhatsAppAlert(env, clientWaPhone, clientWaText, clientWaName);
    } catch {}
  }

  await notifyAllAdmins(env, payload);
  return json({ ok: true }, 200, origin);
};
