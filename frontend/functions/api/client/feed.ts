// GET  /api/client/feed -> { banner, notifications[], unread, deliveries[] } for the signed-in client
// POST /api/client/feed { action:"read_all" } | { action:"click", banner_id }
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

async function rows(env: any, path: string) {
  const r = await supaService(env, path, { method: "GET" });
  return r.ok ? ((await r.json()) as any[]) : [];
}

export const onRequestGet: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request); if (user instanceof Response) return user;
  const cid = await resolveOwnCustomerId(env, user);
  const now = new Date().toISOString();

  const banners = await rows(env, `offer_banners?active=eq.true&show_portal=eq.true&or=(starts_at.is.null,starts_at.lte.${now})&or=(ends_at.is.null,ends_at.gte.${now})&select=id,title,subtitle,coupon_code,cta_label,cta_link,image_url,overlay_color,overlay_opacity,ends_at,views&order=created_at.desc&limit=1`);
  const banner = banners[0] || null;
  if (banner) supaService(env, `offer_banners?id=eq.${banner.id}`, { method: "PATCH", body: JSON.stringify({ views: Number(banner.views || 0) + 1 }) }).catch(() => {});

  const notes = await rows(env, `client_notifications?${cid ? `or=(customer_id.is.null,customer_id.eq.${cid})` : "customer_id=is.null"}&select=id,title,body,link,read_by,created_at&order=created_at.desc&limit=30`);
  const notifications = notes.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, created_at: n.created_at, read: (n.read_by || []).includes(user.id) }));
  const deliveries = cid ? await rows(env, `booking_deliveries?customer_id=eq.${cid}&select=id,link,photos,videos,expires_at,created_at,appointments(appointment_ref,service_name,booking_date)&order=created_at.desc&limit=50`) : [];
  return json({ banner, notifications, unread: notifications.filter((n) => !n.read).length, deliveries }, 200, origin);
};

export const onRequestPost: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request); if (user instanceof Response) return user;
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  if (b.action === "click" && /^[0-9a-f-]{36}$/i.test(String(b.banner_id || ""))) {
    const r = await rows(env, `offer_banners?id=eq.${b.banner_id}&select=clicks`);
    if (r[0]) await supaService(env, `offer_banners?id=eq.${b.banner_id}`, { method: "PATCH", body: JSON.stringify({ clicks: Number(r[0].clicks || 0) + 1 }) });
    return json({ ok: true }, 200, origin);
  }
  if (b.action === "read_all") {
    const cid = await resolveOwnCustomerId(env, user);
    const notes = await rows(env, `client_notifications?${cid ? `or=(customer_id.is.null,customer_id.eq.${cid})` : "customer_id=is.null"}&select=id,read_by&order=created_at.desc&limit=30`);
    for (const n of notes) {
      if ((n.read_by || []).includes(user.id)) continue;
      await supaService(env, `client_notifications?id=eq.${n.id}`, { method: "PATCH", body: JSON.stringify({ read_by: [...(n.read_by || []), user.id] }) });
    }
    return json({ ok: true }, 200, origin);
  }
  return json({ error: "Invalid action." }, 400, origin);
};
