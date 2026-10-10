// POST /api/bookings/coupon   body: { code, package_id }
// Previews a discount for the booking form. Never lists codes; only answers for the one code typed.
import { json, corsHeaders, supaAdmin } from "../../_shared/adminAuth";
import { checkCoupon } from "../../_shared/coupons";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const sRes = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" });
  const raw = sRes.ok ? ((await sRes.json()) as any[])?.[0]?.value : null;
  const site = typeof raw === "string" ? JSON.parse(raw) : raw || {};
  const pkg = (site.pricingPackages || []).find((p: any) => String(p.id) === String(b?.package_id || ""));
  const base = pkg ? parseFloat(String(pkg.price || "0").replace(/[^0-9.]/g, "")) : NaN;
  if (!pkg || !(base > 0)) return json({ error: "Please choose a package first." }, 400, origin);
  const res = await checkCoupon(env, b?.code, base);
  if ("error" in res) return json({ error: res.error }, 400, origin);
  return json({ code: res.code, discount: res.discount, label: res.label }, 200, origin);
};
