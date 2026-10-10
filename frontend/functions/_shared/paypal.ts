// PayPal Checkout (Orders v2) for EXISTING bookings. Server-side only -- the client secret
// never leaves Cloudflare. Amounts always come from the appointments/payments rows, never
// from the browser. PayPal does not settle in AED, so the AED total is converted to USD at
// the fixed UAE peg (1 USD = 3.6725 AED) and that USD figure is what is charged + verified.
import { supaAdmin } from "./adminAuth";

export const AED_PER_USD = 3.6725;

export function paypalBase(env: any): string {
  return String(env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured(env: any): boolean {
  return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

export function usdFromAed(aed: number): string {
  return (Math.round((Number(aed) / AED_PER_USD) * 100) / 100).toFixed(2);
}

export async function paypalToken(env: any): Promise<string> {
  const res = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  return ((await res.json()) as any).access_token;
}

export async function paypalApi(env: any, token: string, path: string, init: RequestInit & { requestId?: string } = {}) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers as any) };
  if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;
  const res = await fetch(`${paypalBase(env)}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: body as any };
}

/** Loads the booking + its payment row and checks it can be paid online right now. */
export async function loadPayableBooking(env: any, appointmentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(appointmentId || "")) return { error: "Invalid booking.", code: 400 } as const;
  const aRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}&select=id,appointment_ref,status,total,currency,service_name,package_name,payments(*)`, { method: "GET" });
  const appt = aRes.ok ? ((await aRes.json()) as any[])?.[0] : null;
  if (!appt) return { error: "Booking not found.", code: 404 } as const;
  const payment = (appt.payments || []).find((p: any) => p.method === "paypal") || null;
  if (!payment) return { error: "This booking is not set up for online payment.", code: 400 } as const;
  return { appt, payment } as const;
}
