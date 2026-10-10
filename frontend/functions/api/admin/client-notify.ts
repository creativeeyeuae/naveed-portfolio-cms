// POST /api/admin/client-notify (admin only)
//   { audience:"all"|"upcoming"|"one", customer_id?, title, body, link?, whatsapp?:bool, email?:bool }
// Always adds a portal-bell notification; optionally also WhatsApp / email (capped at 300 recipients).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { addClientNotification } from "../../_shared/clientExtras";
import { forwardClientWhatsAppAlert } from "../../_shared/liveChatWhatsapp";
import { resendPayload } from "../../_shared/emailDeliver";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const title = String(b.title || "").trim().slice(0, 160), body = String(b.body || "").trim().slice(0, 1000);
  const link = /^(https:\/\/|\/)/.test(String(b.link || "")) ? String(b.link).slice(0, 500) : "";
  if (!title) return json({ error: "Please add a title." }, 400, origin);

  let customers: any[] = [];
  if (b.audience === "one") {
    if (!/^[0-9a-f-]{36}$/i.test(String(b.customer_id || ""))) return json({ error: "Choose a client." }, 400, origin);
    customers = ((await (await supaAdmin(env, `customers?id=eq.${b.customer_id}&select=id,full_name,email,whatsapp,phone`, { method: "GET" })).json()) as any[]) || [];
    await addClientNotification(env, b.customer_id, title, body, link, admin.email);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const path = b.audience === "upcoming"
      ? `appointments?booking_date=gte.${today}&status=in.(pending_verification,confirmed)&select=customers(id,full_name,email,whatsapp,phone)&limit=1000`
      : `customers?select=id,full_name,email,whatsapp,phone&limit=1000`;
    const rows = ((await (await supaAdmin(env, path, { method: "GET" })).json()) as any[]) || [];
    const seen = new Set<string>();
    customers = rows.map((r) => r.customers || r).filter((c) => c?.id && !seen.has(c.id) && seen.add(c.id));
    if (b.audience === "upcoming") for (const c of customers) await addClientNotification(env, c.id, title, body, link, admin.email);
    else await addClientNotification(env, null, title, body, link, admin.email);
  }

  let wa = 0, em = 0;
  const list = customers.slice(0, 300);
  for (const c of list) {
    if (b.whatsapp && (c.whatsapp || c.phone)) { try { if (await forwardClientWhatsAppAlert(env, c.whatsapp || c.phone, `🔔 ${title}${body ? "\n\n" + body : ""}${link ? "\n\n" + (link.startsWith("/") ? "https://bynaveedanjum.com" + link : link) : ""}\n— Naveed Anjum`, c.full_name)) wa++; } catch {} }
    if (b.email && c.email && (env as any).RESEND_API_KEY) {
      try {
        const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#222"><h2 style="margin:0 0 10px">${title.replace(/</g, "&lt;")}</h2><p style="white-space:pre-wrap;line-height:1.6">${body.replace(/</g, "&lt;")}</p>${link ? `<p><a href="${link.startsWith("/") ? "https://bynaveedanjum.com" + link : link}" style="background:#6D28D9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open</a></p>` : ""}<p style="color:#666">— Naveed Anjum</p></div>`;
        const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${(env as any).RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(resendPayload(env, c.email, title, html)) });
        if (r.ok) em++;
        await new Promise((res) => setTimeout(res, 550));
      } catch {}
    }
  }
  return json({ ok: true, recipients: customers.length, whatsapp: wa, email: em, capped: customers.length > 300 }, 200, origin);
};
