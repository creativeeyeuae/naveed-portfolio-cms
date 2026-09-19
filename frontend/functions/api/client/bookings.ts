// GET /api/client/bookings
//
// Lists the SIGNED-IN customer's own bookings + payment status, for the /client portal.
// Mirrors admin/bookings.ts's shape (appointments joined with payments, plus a short-lived
// signed receipt URL) but scoped to exactly one customer -- the customer_id used for every
// query below is derived server-side from the caller's own verified Supabase session, never
// accepted from the request, so this endpoint can never return another client's data.
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const customerId = await resolveOwnCustomerId(env, user);
  if (!customerId) return json({ bookings: [] }, 200, origin); // no bookings yet -- not an error

  const res = await supaService(
    env,
    `appointments?customer_id=eq.${customerId}&select=*,payments(*)&order=created_at.desc&limit=200`,
    { method: "GET" }
  );
  if (!res.ok) {
    const t = await res.text();
    return json({ error: "Could not load your bookings.", detail: t }, 500, origin);
  }
  const rows = (await res.json()) as any[];

  // For any payment with a receipt on file, mint a short-lived signed URL so the client can
  // view their own receipt -- the receipts bucket has no public/anon read access at all.
  for (const row of rows) {
    for (const p of row.payments || []) {
      if (p.receipt_path) {
        try {
          const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/receipts/${p.receipt_path}`, {
            method: "POST",
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ expiresIn: 600 }),
          });
          if (signRes.ok) {
            const { signedURL } = (await signRes.json()) as { signedURL: string };
            p.receipt_signed_url = `${SUPABASE_URL}/storage/v1${signedURL}`;
          }
        } catch {
          // If signing fails for one receipt, just omit its URL rather than failing the list.
        }
      }
    }
  }

  return json({ bookings: rows }, 200, origin);
};
