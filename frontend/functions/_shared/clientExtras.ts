// Shared helpers for client requests + wallet.
import { supaAdmin } from "./adminAuth";

/** Cancellation fee per the Terms: >72h free, 72-24h 50%, <24h 100%. Times in UAE (UTC+4). */
export function cancelFeePercent(bookingDate: string, bookingTime: string, now = Date.now()): number {
  const start = new Date(`${bookingDate}T${(bookingTime || "00:00:00").slice(0, 8)}+04:00`).getTime();
  if (!Number.isFinite(start)) return 0;
  const hours = (start - now) / 3600e3;
  if (hours > 72) return 0;
  if (hours >= 24) return 50;
  return 100;
}

export async function walletBalance(env: any, customerId: string): Promise<number> {
  const r = await supaAdmin(env, `wallet_transactions?customer_id=eq.${customerId}&select=amount`, { method: "GET" });
  if (!r.ok) return 0;
  const rows = (await r.json()) as any[];
  return Math.round(rows.reduce((t, x) => t + Number(x.amount || 0), 0) * 100) / 100;
}

/** Adds a portal-bell notification (customerId null = all clients). Never throws. */
export async function addClientNotification(env: any, customerId: string | null, title: string, body = "", link = "", by = "system") {
  try {
    await supaAdmin(env, "client_notifications", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_id: customerId, title: title.slice(0, 160), body: body.slice(0, 1000) || null, link: link || null, created_by: by }) });
  } catch {}
}
