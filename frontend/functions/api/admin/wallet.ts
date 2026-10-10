// /api/admin/wallet  (admin only)
//   GET  ?q=email-or-phone           -> matching clients with balances
//   GET  ?customer_id=               -> balance + history
//   POST { customer_id, amount, kind, note } -> add credit (+) or deduct (-)
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { walletBalance, addClientNotification } from "../../_shared/clientExtras";
import { forwardClientWhatsAppAlert } from "../../_shared/liveChatWhatsapp";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const u = new URL(request.url);
  const cid = u.searchParams.get("customer_id");
  if (cid) {
    const r = await supaAdmin(env, `wallet_transactions?customer_id=eq.${encodeURIComponent(cid)}&select=*&order=created_at.desc&limit=200`, { method: "GET" });
    if (!r.ok) return json({ error: "Wallet table not found. Run database/migrations/0023_client_requests_wallet.sql in Supabase." }, 500, origin);
    const tx = (await r.json()) as any[];
    return json({ balance: Math.round(tx.reduce((t, x) => t + Number(x.amount), 0) * 100) / 100, transactions: tx }, 200, origin);
  }
  const q = String(u.searchParams.get("q") || "").trim();
  if (q.length < 3) return json({ clients: [] }, 200, origin);
  const digits = q.replace(/\D/g, "").slice(-9);
  const or = [`email.ilike.*${encodeURIComponent(q)}*`, `full_name.ilike.*${encodeURIComponent(q)}*`];
  if (digits.length >= 6) or.push(`whatsapp.ilike.*${digits}*`, `phone.ilike.*${digits}*`);
  const r = await supaAdmin(env, `customers?or=(${or.join(",")})&select=id,full_name,email,whatsapp,phone&limit=10`, { method: "GET" });
  const rows = r.ok ? ((await r.json()) as any[]) : [];
  for (const c of rows) c.balance = await walletBalance(env, c.id);
  return json({ clients: rows }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const amount = Math.round(Number(b.amount) * 100) / 100;
  if (!/^[0-9a-f-]{36}$/i.test(String(b.customer_id || "")) || !amount || Math.abs(amount) > 100000) return json({ error: "Enter a valid amount." }, 400, origin);
  const kind = ["credit", "refund", "gift", "debit", "adjustment"].includes(b.kind) ? b.kind : amount > 0 ? "credit" : "debit";
  if (amount < 0 && (await walletBalance(env, b.customer_id)) + amount < 0) return json({ error: "Not enough balance for this deduction." }, 400, origin);
  const r = await supaAdmin(env, "wallet_transactions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_id: b.customer_id, amount, kind, note: String(b.note || "").slice(0, 300) || null, created_by: admin.email }) });
  if (!r.ok) return json({ error: "Could not save.", detail: (await r.text()).slice(0, 200) }, 500, origin);
  const balance = await walletBalance(env, b.customer_id);
  await addClientNotification(env, b.customer_id, amount > 0 ? `💳 AED ${amount} added to your wallet` : `💳 AED ${Math.abs(amount)} used from your wallet`, `${b.note ? b.note + " · " : ""}Balance: AED ${balance}`, "/client", admin.email);
  if (amount > 0) {
    try {
      const c = ((await (await supaAdmin(env, `customers?id=eq.${b.customer_id}&select=full_name,whatsapp,phone`, { method: "GET" })).json()) as any[])?.[0];
      const ph = c?.whatsapp || c?.phone;
      if (ph) await forwardClientWhatsAppAlert(env, ph, `🎁 Hi ${c.full_name || ""}, AED ${amount.toLocaleString("en-US")} has been added to your Naveed Anjum wallet.${b.note ? "\n" + b.note : ""}\nBalance: AED ${balance.toLocaleString("en-US")}\nView it at bynaveedanjum.com/client`, c.full_name);
    } catch {}
  }
  return json({ ok: true, balance }, 200, origin);
};
