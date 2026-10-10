// /api/admin/coupons  (admin only)
//   GET                          -> list coupons
//   POST  {kind,value,quantity?,prefix?,code?,max_uses?,min_amount?,expires_at?,note?} -> generate
//   PATCH {id, active}           -> pause / resume
//   DELETE ?id=                  -> delete
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { normCode, randomCode } from "../../_shared/coupons";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

const num = (v: any) => (v === "" || v == null ? null : Number(v));

export const onRequest: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === "GET") {
    const r = await supaAdmin(env, "coupons?select=*&order=created_at.desc&limit=500", { method: "GET" });
    if (!r.ok) return json({ error: "Coupons table not found. Run database/migrations/0022_coupons.sql in Supabase.", detail: await r.text() }, 500, origin);
    return json({ coupons: await r.json() }, 200, origin);
  }

  if (request.method === "POST") {
    let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
    const kind = b.kind === "fixed" ? "fixed" : "percent";
    const value = Number(b.value);
    if (!(value > 0) || (kind === "percent" && value > 100)) return json({ error: kind === "percent" ? "Percent must be between 1 and 100." : "Amount must be more than 0." }, 400, origin);
    const qty = Math.min(Math.max(parseInt(b.quantity || "1", 10) || 1, 1), 200);
    const custom = normCode(b.code);
    if (custom && qty > 1) return json({ error: "A custom code can only be created once — set quantity to 1." }, 400, origin);
    const expires = b.expires_at ? new Date(b.expires_at + (String(b.expires_at).length === 10 ? "T23:59:59+04:00" : "")).toISOString() : null;
    const rows = Array.from({ length: qty }, () => ({
      code: custom || randomCode(b.prefix), kind, value,
      max_uses: num(b.max_uses), min_amount: num(b.min_amount), expires_at: expires,
      note: String(b.note || "").slice(0, 300) || null, created_by: admin.email, active: true,
    }));
    const r = await supaAdmin(env, "coupons", { method: "POST", body: JSON.stringify(rows) });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: /duplicate|unique/i.test(t) ? "That code already exists." : "Could not create coupons.", detail: t.slice(0, 300) }, 400, origin);
    }
    return json({ coupons: await r.json() }, 200, origin);
  }

  if (request.method === "PATCH") {
    let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
    if (!/^[0-9a-f-]{36}$/i.test(String(b.id || ""))) return json({ error: "Invalid id." }, 400, origin);
    const r = await supaAdmin(env, `coupons?id=eq.${b.id}`, { method: "PATCH", body: JSON.stringify({ active: !!b.active }) });
    return r.ok ? json({ ok: true }, 200, origin) : json({ error: "Update failed." }, 500, origin);
  }

  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id." }, 400, origin);
    const r = await supaAdmin(env, `coupons?id=eq.${id}`, { method: "DELETE" });
    return r.ok ? json({ ok: true }, 200, origin) : json({ error: "Delete failed." }, 500, origin);
  }
  return json({ error: "Method not allowed." }, 405, origin);
};
