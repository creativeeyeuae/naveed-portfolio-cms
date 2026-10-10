// POST /api/bookings/create
// Creates a website booking SERVER-SIDE (service-role key), so the public site never writes to
// appointments/payments directly (those tables have RLS with no public insert policy).
// Everything that matters is decided here, not in the browser:
//   - package price comes from the live CMS packages (site_settings.nap_settings.pricingPackages)
//   - 4% fee + total are calculated here
//   - date must be real and within the next 2 years; slot must be free
//   - customer is found/created via the existing find_or_create_customer RPC
import { json, corsHeaders, supaAdmin } from "../../_shared/adminAuth";
import { checkCoupon, useCoupon } from "../../_shared/coupons";
import { unsign, normEmail, normPhone } from "../../_shared/bookingVerify";

const TX_FEE_RATE = 0.04;
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clean = (v: any, max = 200) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

function to24h(t: string): string | null {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10); const min = m[2]; const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h !== 12) h += 12; if (ap === "AM" && h === 12) h = 0;
  if (h > 23 || Number(min) > 59) return null;
  return `${String(h).padStart(2, "0")}:${min}:00`;
}

async function rpc(env: any, fn: string, args: any) {
  const r = await supaAdmin(env, `rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  return { ok: r.ok, data: r.ok ? await r.json().catch(() => null) : null, err: r.ok ? "" : await r.text() };
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }

  const name = clean(b.name, 120), email = clean(b.email, 160).toLowerCase(), phone = clean(b.phone, 40);
  const service = clean(b.service, 120), notes = clean(b.notes, 2000), packageId = clean(b.package_id, 80);
  const method = b.method === "paypal" ? "paypal" : b.method === "cash" ? "cash" : "bank_transfer";
  // Email + WhatsApp must have been verified (signed token from /api/bookings/verify-check).
  const v = await unsign(env, b.verify_token);
  if (!v || v.t !== "verified" || v.e !== normEmail(b.email) || v.p !== normPhone(b.phone)) return json({ error: "Please verify your email and WhatsApp number first.", needVerify: true }, 401, origin);
  if (b.agreed_terms !== true) return json({ error: "Please read and accept the cancellation terms to continue." }, 400, origin);
  const date = clean(b.date, 10), time = to24h(clean(b.time, 12));

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !service || !packageId) return json({ error: "Please complete every required field." }, 400, origin);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) return json({ error: "Please choose a valid date and time." }, 400, origin);
  const day = new Date(date + "T00:00:00Z").getTime(), today = Date.now() - 36 * 3600e3;
  if (!Number.isFinite(day) || day < today || day > Date.now() + 730 * 86400e3) return json({ error: "Please choose a date within the next 2 years." }, 400, origin);

  // Trusted price from the live CMS package.
  const sRes = await supaAdmin(env, "site_settings?key=eq.nap_settings&select=value&limit=1", { method: "GET" });
  const raw = sRes.ok ? ((await sRes.json()) as any[])?.[0]?.value : null;
  const site = typeof raw === "string" ? JSON.parse(raw) : raw || {};
  const pkg = (site.pricingPackages || []).find((p: any) => String(p.id) === packageId);
  const base = pkg ? parseFloat(String(pkg.price || "0").replace(/[^0-9.]/g, "")) : NaN;
  if (!pkg || !Number.isFinite(base) || base <= 0) return json({ error: "That package is no longer available. Please refresh and choose again." }, 400, origin);
  // Optional coupon -- validated and counted here, never trusted from the browser.
  let discount = 0, couponNote = "";
  let couponRow: any = null;
  if (String(b.coupon || "").trim()) {
    const cr = await checkCoupon(env, b.coupon, base);
    if ("error" in cr) return json({ error: cr.error, couponError: true }, 400, origin);
    discount = cr.discount; couponRow = cr.coupon;
    couponNote = `[Coupon ${cr.code}: ${cr.label} = -AED ${discount} (package AED ${base})]`;
  }
  const net = round(Math.max(0, base - discount));
  if (net <= 0) return json({ error: "This code cannot be used for this package." }, 400, origin);
  const fee = round(net * TX_FEE_RATE), total = round(net + fee);

  const slot = await rpc(env, "is_slot_taken", { p_date: date, p_time: time });
  if (slot.ok && slot.data === true) return json({ error: "This time slot is no longer available. Please select another time.", slotTaken: true }, 409, origin);

  const cust = await rpc(env, "find_or_create_customer", { p_full_name: name, p_email: email, p_phone: phone || null, p_whatsapp: phone || null, p_company: null });
  const customerId = typeof cust.data === "string" ? cust.data : null;
  if (!customerId) return json({ error: "Something went wrong saving your details. Please try again." }, 500, origin);

  if (couponRow && !(await useCoupon(env, couponRow))) return json({ error: "This code has just been used up. Please remove it and try again.", couponError: true }, 409, origin);
  const id = crypto.randomUUID();
  const ref = "CF-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32]).join("");
  const aRes = await supaAdmin(env, "appointments", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id, appointment_ref: ref, customer_id: customerId, service_key: service, service_name: service, package_id: packageId, package_name: clean(pkg.label, 120), price_base: net, currency: "AED", transaction_fee: fee, total, booking_date: date, booking_time: time, notes: (notes ? notes + "\n\n" : "") + (couponNote ? couponNote + "\n" : "") + "[Client accepted Terms & Conditions v1 (bynaveedanjum.com/terms) on " + new Date().toISOString() + " - incl. cancellation 72h+ free / 72-24h 50% / <24h no refund; delivery ~7 working days after shoot + full payment]" + (method === "cash" ? "\n[Payment: CASH before the event starts]" : ""), status: "pending_verification" }),
  });
  if (!aRes.ok) return json({ error: "Your booking could not be saved. Please try again.", detail: (await aRes.text()).slice(0, 300) }, 500, origin);

  const pRes = await supaAdmin(env, "payments", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ appointment_id: id, method: method === "cash" ? "bank_transfer" : method, base_amount: net, transaction_fee: fee, total, currency: "AED", status: "under_review", provider: method === "cash" ? "cash" : method === "bank_transfer" ? "bank" : "paypal" }),
  });
  if (!pRes.ok) {
    await supaAdmin(env, `appointments?id=eq.${id}`, { method: "DELETE" }).catch(() => {});
    return json({ error: "Your booking could not be saved. Please try again.", detail: (await pRes.text()).slice(0, 300) }, 500, origin);
  }
  return json({ id, ref, total, base: net, fee, discount }, 200, origin);
};
