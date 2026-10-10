// GET  /api/client/profile  -> { name, email, whatsapp, bio, avatar }
// POST /api/client/profile  { whatsapp?, bio?, avatar? }  -> updates the SIGNED-IN client only.
// Name and email are deliberately read-only (they identify the client on bookings/invoices).
// bio + avatar live in the auth user's metadata; WhatsApp on the existing customers row.
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";
import { toWhatsAppNumber } from "../../_shared/liveChatWhatsapp";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
const adminUser = (env: any, id: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" } });

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

async function load(env: any, user: any) {
  const customerId = await resolveOwnCustomerId(env, user);
  const c = customerId ? ((await (await supaService(env, `customers?id=eq.${customerId}&select=full_name,email,whatsapp,phone`, { method: "GET" })).json()) as any[])?.[0] : null;
  const au: any = await (await adminUser(env, user.id)).json().catch(() => ({}));
  const md = au.user_metadata || {};
  return { customerId, profile: { name: c?.full_name || md.full_name || "", email: user.email, whatsapp: c?.whatsapp || c?.phone || md.whatsapp || "", bio: md.bio || "", avatar: md.avatar || "" }, md };
}

export const onRequestGet: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { profile } = await load(env, user);
  return json(profile, 200, origin);
};

export const onRequestPost: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const { customerId, md } = await load(env, user);

  const meta: any = { ...md };
  if (typeof b.bio === "string") meta.bio = b.bio.replace(/[\u0000-\u001f]/g, " ").slice(0, 600);
  if (typeof b.avatar === "string") {
    if (b.avatar && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.avatar)) return json({ error: "Invalid picture." }, 400, origin);
    if (b.avatar.length > 200_000) return json({ error: "Picture is too large." }, 400, origin);
    meta.avatar = b.avatar;
  }
  if (typeof b.whatsapp === "string" && b.whatsapp.trim()) {
    const wa = toWhatsAppNumber(b.whatsapp);
    if (wa.length < 8 || wa.length > 15) return json({ error: "Please enter a valid WhatsApp number." }, 400, origin);
    meta.whatsapp = wa;
    if (customerId) await supaService(env, `customers?id=eq.${customerId}`, { method: "PATCH", body: JSON.stringify({ whatsapp: "+" + wa, phone: "+" + wa }) });
  }
  const r = await adminUser(env, user.id, { method: "PUT", body: JSON.stringify({ user_metadata: meta }) });
  if (!r.ok) return json({ error: "Could not save your profile." }, 500, origin);
  const { profile } = await load(env, user);
  return json(profile, 200, origin);
};
