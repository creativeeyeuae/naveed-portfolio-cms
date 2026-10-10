// /api/admin/deliver (admin only)
//   GET                 -> { bookings: paid/confirmed bookings + any deliveries, templates }
//   POST {action:"templates", wa, emailSubject, emailBody} -> saves templates in nap_settings
//   POST {appointment_id, link, photos, videos, days, email, whatsapp, complete}
//        -> stores delivery, sends client WhatsApp/email from templates, portal notification,
//           optionally marks the booking completed. Only for fully paid bookings.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { addClientNotification } from "../../_shared/clientExtras";
import { forwardClientWhatsAppAlert } from "../../_shared/liveChatWhatsapp";
import { resendPayload } from "../../_shared/emailDeliver";

const DEFAULT_TPL = {
  wa: "🎉 Hi {name}, your final {service} files are ready!\n\n📸 {photos} photos · 🎬 {videos} videos\n🔗 Download: {link}\n⏳ Available until {expires}\n\nRef: {ref}\nPlease download and keep a backup. It was a pleasure working with you!\n— Naveed Anjum",
  emailSubject: "Your final files are ready — {ref}",
  emailBody: "Hi {name}, it's delivery day!\n\nYour {service} gallery — {photos} photos and {videos} videos — is ready to download.\n\nThe link is available until {expires}. Please download and keep a backup.\n\nRef {ref}",
};

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

let settingsWasString = false;
async function settings(env: any) {
  const r = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" });
  const v = r.ok ? ((await r.json()) as any[])?.[0]?.value : null;
  settingsWasString = typeof v === "string";
  return typeof v === "string" ? JSON.parse(v) : v || {};
}
const tpls = (s: any) => ({ wa: s.dlvTplWa || DEFAULT_TPL.wa, emailSubject: s.dlvTplEmailSubject || DEFAULT_TPL.emailSubject, emailBody: s.dlvTplEmailBody || DEFAULT_TPL.emailBody });
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const r = await supaAdmin(env, "appointments?status=in.(confirmed,completed)&select=id,appointment_ref,service_name,package_name,booking_date,status,customers(full_name,email,whatsapp,phone),payments(status),booking_deliveries(id,link,created_at)&order=booking_date.desc&limit=200", { method: "GET" });
  if (!r.ok) return json({ error: "Deliveries table not found. Run database/migrations/0024_offers_notifications_deliveries.sql in Supabase.", detail: (await r.text()).slice(0, 200) }, 500, origin);
  return json({ bookings: await r.json(), templates: tpls(await settings(env)) }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }

  if (b.action === "templates") {
    const s = await settings(env);
    s.dlvTplWa = String(b.wa || "").slice(0, 2000) || DEFAULT_TPL.wa;
    s.dlvTplEmailSubject = String(b.emailSubject || "").slice(0, 200) || DEFAULT_TPL.emailSubject;
    s.dlvTplEmailBody = String(b.emailBody || "").slice(0, 4000) || DEFAULT_TPL.emailBody;
    const r = await supaAdmin(env, "site_settings?key=eq.nap_settings", { method: "PATCH", body: JSON.stringify({ value: settingsWasString ? JSON.stringify(s) : s }) });
    return r.ok ? json({ ok: true, templates: tpls(s) }, 200, origin) : json({ error: "Could not save templates." }, 500, origin);
  }

  const link = String(b.link || "").trim();
  if (!/^https:\/\/(drive|docs)\.google\.com\/[^\s"'<>]+$/.test(link) && !/^https:\/\/[^\s"'<>]+$/.test(link)) return json({ error: "Please paste a valid https:// link (Google Drive)." }, 400, origin);
  const ar = await supaAdmin(env, `appointments?id=eq.${encodeURIComponent(String(b.appointment_id || ""))}&select=*,customers(id,full_name,email,whatsapp,phone),payments(status)`, { method: "GET" });
  const a = ar.ok ? ((await ar.json()) as any[])?.[0] : null;
  if (!a) return json({ error: "Booking not found." }, 404, origin);
  if (!(a.payments || []).some((p: any) => p.status === "paid")) return json({ error: "This booking is not fully paid yet — files are only delivered after payment." }, 409, origin);

  const days = [30, 60, 90].includes(Number(b.days)) ? Number(b.days) : 30;
  const expires = new Date(Date.now() + days * 86400e3);
  const c = a.customers || {};
  const map: Record<string, string> = {
    name: String(c.full_name || "").trim().split(/\s+/)[0] || "there", ref: a.appointment_ref, service: a.service_name || "shoot",
    link, photos: String(parseInt(b.photos, 10) || 0), videos: String(parseInt(b.videos, 10) || 0),
    expires: expires.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  };
  const fill = (t: string) => t.replace(/\{(name|ref|service|link|photos|videos|expires)\}/g, (_m, k) => map[k]);
  const T = tpls(await settings(env));

  let sentWa = false, sentEmail = false;
  if (b.whatsapp && (c.whatsapp || c.phone)) { try { sentWa = !!(await forwardClientWhatsAppAlert(env, c.whatsapp || c.phone, fill(T.wa), c.full_name)); } catch {} }
  if (b.email && c.email && (env as any).RESEND_API_KEY) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#FAF8FD;padding:28px;border-radius:12px;color:#2A2438"><div style="font-size:11px;font-weight:bold;letter-spacing:2px;color:#6D28D9">YOUR FILES ARE READY</div><div style="white-space:pre-wrap;font-size:15px;line-height:1.6;margin:12px 0 20px">${esc(fill(T.emailBody))}</div><a href="${esc(link)}" style="display:inline-block;background:#6D28D9;color:#fff;text-decoration:none;font-weight:bold;border-radius:10px;padding:13px 20px">Download your files</a><p style="font-size:12px;color:#5B5470;margin-top:20px">— Naveed Anjum · bynaveedanjum.com</p></div>`;
    try { const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${(env as any).RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env, c.email, fill(T.emailSubject), html)) }); sentEmail = r.ok; } catch {}
  }
  const ins = await supaAdmin(env, "booking_deliveries", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: a.id, customer_id: c.id || a.customer_id, link, photos: parseInt(b.photos, 10) || null, videos: parseInt(b.videos, 10) || null, expires_at: expires.toISOString(), sent_email: sentEmail, sent_whatsapp: sentWa, created_by: admin.email }) });
  if (!ins.ok) return json({ error: "Deliveries table not found. Run migration 0024 in Supabase.", detail: (await ins.text()).slice(0, 200) }, 500, origin);
  await addClientNotification(env, c.id || a.customer_id, `📁 Your files for ${a.appointment_ref} are ready`, `${map.photos} photos · ${map.videos} videos · available until ${map.expires}`, link, admin.email);
  if (b.complete && a.status !== "completed") {
    await supaAdmin(env, `appointments?id=eq.${a.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed", updated_at: new Date().toISOString() }) });
    await supaAdmin(env, "appointment_status_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: a.id, old_status: a.status, new_status: "completed", changed_by: `admin:${admin.email}`, reason: "Final files delivered" }) }).catch(() => {});
  }
  return json({ ok: true, whatsapp: sentWa, email: sentEmail }, 200, origin);
};
