// GET /api/client/wallet -> { balance, transactions } for the signed-in client only.
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request); if (user instanceof Response) return user;
  const cid = await resolveOwnCustomerId(env, user);
  if (!cid) return json({ balance: 0, transactions: [] }, 200, origin);
  const r = await supaService(env, `wallet_transactions?customer_id=eq.${cid}&select=id,amount,currency,kind,note,created_at&order=created_at.desc&limit=200`, { method: "GET" });
  const tx = r.ok ? ((await r.json()) as any[]) : [];
  const balance = Math.round(tx.reduce((t, x) => t + Number(x.amount || 0), 0) * 100) / 100;
  return json({ balance, transactions: tx }, 200, origin);
};
