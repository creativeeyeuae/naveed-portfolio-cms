// /api/unsubscribe?t=<signed token>  -- one-click unsubscribe for marketing emails.
// GET shows a confirmation page; POST is Gmail/Yahoo "one-click" (List-Unsubscribe-Post).
// The token is signed by the server, so nobody can unsubscribe someone else's address.
import { supaAdmin } from "../_shared/adminAuth";
import { unsign } from "../_shared/bookingVerify";

async function handle(env: any, url: URL): Promise<string | null> {
  const data = await unsign(env, url.searchParams.get("t") || "");
  const email = String(data?.u || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  await supaAdmin(env, `outreach_contacts?email=eq.${encodeURIComponent(email)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "inactive", updated_at: new Date().toISOString() }) }).catch(() => {});
  await supaAdmin(env, "audit_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor: "recipient", action: "email_unsubscribed", entity_type: "email", details: { email } }) }).catch(() => {});
  return email;
}
const page = (msg: string) => new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:Arial,sans-serif;background:#f3f1f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="background:#fff;border-radius:14px;padding:32px;max-width:420px;text-align:center;color:#2a2438"><h1 style="font-size:22px;margin:0 0 10px">${msg}</h1><p style="color:#6b6378;font-size:14px">Naveed Anjum · bynaveedanjum.com</p></div></body>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });

export const onRequestGet: PagesFunction<any> = async ({ request, env }) => {
  const email = await handle(env, new URL(request.url));
  return page(email ? "You're unsubscribed. You won't receive marketing emails from us again." : "This unsubscribe link is invalid or expired.");
};
export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  await handle(env, new URL(request.url));
  return new Response("ok");
};
