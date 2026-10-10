// POST /api/bookings/account
//   { verify_token, mode:"status" }                    -> { exists }
//   { verify_token, mode:"create", name, password }    -> creates the client login (email already
//                                                          verified by our code) + links customer
// Only works with a valid "verified" token from /api/bookings/verify-check, so an account can
// only be created for an email + WhatsApp the person has just proved they own.
import { json, corsHeaders, supaAdmin } from "../../_shared/adminAuth";
import { unsign, normPhone } from "../../_shared/bookingVerify";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";

async function findCustomer(env: any, email: string, phone: string) {
  const last9 = normPhone(phone).slice(-9);
  const or = [`email.ilike.${encodeURIComponent(email)}`];
  if (last9.length === 9) or.push(`whatsapp.ilike.*${last9}`, `phone.ilike.*${last9}`);
  const r = await supaAdmin(env, `customers?or=(${or.join(",")})&select=id,email,auth_user_id,created_at&order=created_at.asc&limit=5`, { method: "GET" });
  const rows = r.ok ? ((await r.json()) as any[]) : [];
  return rows.find((x) => String(x.email || "").toLowerCase() === email) || rows[0] || null;
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const v = await unsign(env, b.verify_token);
  if (!v || v.t !== "verified") return json({ error: "Please verify your email and WhatsApp first.", needVerify: true }, 401, origin);
  const email: string = v.e, phone: string = v.p;

  const cust = await findCustomer(env, email, phone);
  if (b.mode === "status") return json({ exists: !!cust?.auth_user_id }, 200, origin);

  const password = String(b.password || "");
  const name = String(b.name || "").trim().slice(0, 120);
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return json({ error: "Password must be at least 8 characters with letters and numbers." }, 400, origin);

  // Create the login with the email already confirmed (we just verified it with our own code).
  const cr = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name, whatsapp: phone } }),
  });
  const cj: any = await cr.json().catch(() => ({}));
  if (!cr.ok) {
    if (cr.status === 422 || /already|registered|exists/i.test(JSON.stringify(cj))) return json({ exists: true, error: "You already have an account — please enter your password." }, 409, origin);
    return json({ error: "Could not create your account. Please try again." }, 500, origin);
  }
  const userId = cj.id || cj.user?.id;

  // Link to the existing client record (or create one) -- never a duplicate.
  let customerId = cust?.id || null;
  if (!customerId) {
    const rpc = await supaAdmin(env, "rpc/find_or_create_customer", { method: "POST", body: JSON.stringify({ p_full_name: name || email, p_email: email, p_phone: "+" + phone, p_whatsapp: "+" + phone, p_company: null }) });
    const d = rpc.ok ? await rpc.json().catch(() => null) : null;
    customerId = typeof d === "string" ? d : null;
  }
  if (customerId && userId) {
    await supaAdmin(env, `customers?id=eq.${customerId}&auth_user_id=is.null`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ auth_user_id: userId }) }).catch(() => {});
  }
  return json({ ok: true }, 200, origin);
};
