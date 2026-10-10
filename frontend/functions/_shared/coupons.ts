// Coupon logic shared by /api/bookings/coupon, /api/bookings/create and /api/admin/coupons.
// All reads/writes use the service-role key; the coupons table has no public RLS policies.
import { supaAdmin } from "./adminAuth";

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const normCode = (c: any) => String(c ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);

/** Validates a code against a package base price. Returns the discount in AED or an error. */
export async function checkCoupon(env: any, rawCode: string, base: number) {
  const code = normCode(rawCode);
  if (code.length < 3) return { error: "Please enter a valid code." } as const;
  const r = await supaAdmin(env, `coupons?code=eq.${encodeURIComponent(code)}&select=*&limit=1`, { method: "GET" });
  const c = r.ok ? ((await r.json()) as any[])?.[0] : null;
  if (!c || !c.active) return { error: "This code is not valid." } as const;
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return { error: "This code has expired." } as const;
  if (c.max_uses && c.used_count >= c.max_uses) return { error: "This code has already been used." } as const;
  if (c.min_amount && base < Number(c.min_amount)) return { error: `This code needs a package of at least AED ${Number(c.min_amount).toLocaleString("en-US")}.` } as const;
  const off = c.kind === "percent" ? round(base * Number(c.value) / 100) : Math.min(round(Number(c.value)), base);
  return { coupon: c, code, discount: off, label: c.kind === "percent" ? `${Number(c.value)}% off` : `AED ${Number(c.value).toLocaleString("en-US")} off` } as const;
}

/** Counts one use, safely (optimistic lock so two bookings can't over-use a limited code). */
export async function useCoupon(env: any, c: any): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const cur = await supaAdmin(env, `coupons?id=eq.${c.id}&select=used_count,max_uses,active`, { method: "GET" });
    const row = cur.ok ? ((await cur.json()) as any[])?.[0] : null;
    if (!row || !row.active || (row.max_uses && row.used_count >= row.max_uses)) return false;
    const upd = await supaAdmin(env, `coupons?id=eq.${c.id}&used_count=eq.${row.used_count}`, {
      method: "PATCH", body: JSON.stringify({ used_count: row.used_count + 1 }),
    });
    if (upd.ok && ((await upd.json()) as any[]).length) return true;
  }
  return false;
}

export function randomCode(prefix = ""): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const body = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => A[x % 32]).join("");
  const p = normCode(prefix).replace(/-+$/, "");
  return p ? `${p}-${body}` : body;
}
