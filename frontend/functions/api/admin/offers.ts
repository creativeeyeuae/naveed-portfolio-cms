// /api/admin/offers (admin only): GET list · POST create · PATCH {id, active} · DELETE ?id=
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { addClientNotification } from "../../_shared/clientExtras";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const str = (v: any, n: number) => (String(v ?? "").trim().slice(0, n) || null);
const okUrl = (u: any) => { const s = String(u || "").trim(); return !s ? null : /^(https:\/\/|\/)[^\s"'<>]+$/.test(s) ? s.slice(0, 600) : undefined; };

export const onRequest: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const missing = "Offers table not found. Run database/migrations/0024_offers_notifications_deliveries.sql in Supabase.";

  if (request.method === "GET") {
    const r = await supaAdmin(env, "offer_banners?select=*&order=created_at.desc&limit=100", { method: "GET" });
    return r.ok ? json({ offers: await r.json() }, 200, origin) : json({ error: missing }, 500, origin);
  }
  let b: any = {}; if (request.method !== "DELETE") { try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); } }

  if (request.method === "POST") {
    const image = okUrl(b.image_url), link = okUrl(b.cta_link || "/booking");
    if (!str(b.title, 140)) return json({ error: "Please add a title." }, 400, origin);
    if (image === undefined) return json({ error: "Image must be an https:// link." }, 400, origin);
    if (link === undefined) return json({ error: "Button link must start with https:// or /." }, 400, origin);
    const day = (d: any, end: boolean) => (d ? new Date(String(d) + (String(d).length === 10 ? (end ? "T23:59:59+04:00" : "T00:00:00+04:00") : "")).toISOString() : null);
    const row = {
      title: str(b.title, 140), subtitle: str(b.subtitle, 240), coupon_code: str(b.coupon_code, 40)?.toUpperCase() || null,
      cta_label: str(b.cta_label, 40) || "Book now", cta_link: link || "/booking", image_url: image,
      overlay_color: /^#[0-9a-f]{6}$/i.test(String(b.overlay_color || "")) ? b.overlay_color : "#1B0F33",
      overlay_opacity: Math.min(95, Math.max(0, parseInt(b.overlay_opacity ?? 55, 10) || 0)),
      show_portal: b.show_portal !== false, show_website: !!b.show_website,
      starts_at: day(b.starts_at, false), ends_at: day(b.ends_at, true), active: true, created_by: admin.email,
    };
    const r = await supaAdmin(env, "offer_banners", { method: "POST", body: JSON.stringify(row) });
    if (!r.ok) return json({ error: missing, detail: (await r.text()).slice(0, 200) }, 500, origin);
    if (b.notify_all) await addClientNotification(env, null, `🎁 ${row.title}`, [row.subtitle, row.coupon_code ? `Code: ${row.coupon_code}` : ""].filter(Boolean).join(" · "), row.cta_link, admin.email);
    return json({ ok: true }, 200, origin);
  }
  if (request.method === "PATCH") {
    if (!/^[0-9a-f-]{36}$/i.test(String(b.id || ""))) return json({ error: "Invalid id." }, 400, origin);
    const r = await supaAdmin(env, `offer_banners?id=eq.${b.id}`, { method: "PATCH", body: JSON.stringify({ active: !!b.active }) });
    return r.ok ? json({ ok: true }, 200, origin) : json({ error: "Update failed." }, 500, origin);
  }
  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id." }, 400, origin);
    const r = await supaAdmin(env, `offer_banners?id=eq.${id}`, { method: "DELETE" });
    return r.ok ? json({ ok: true }, 200, origin) : json({ error: "Delete failed." }, 500, origin);
  }
  return json({ error: "Method not allowed." }, 405, origin);
};
