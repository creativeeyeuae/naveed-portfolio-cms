// POST /api/bookings/receipt   multipart: appointment_id, file
// Attaches a bank-transfer receipt to a JUST-CREATED website booking, server-side.
// Only allowed for bank-transfer bookings that are not yet paid and were created in the last
// 24 hours (the guest has no login, so the unguessable booking id + time window is the check).
import { json, corsHeaders, supaAdmin } from "../../_shared/adminAuth";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
const OK_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "application/pdf": "pdf" };

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<any> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  let form: FormData; try { form = await request.formData(); } catch { return json({ error: "Invalid upload." }, 400, origin); }
  const id = String(form.get("appointment_id") || "");
  const file = form.get("file") as unknown as File | null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !file || typeof (file as any).arrayBuffer !== "function") return json({ error: "Invalid upload." }, 400, origin);
  const ext = OK_TYPES[(file.type || "").toLowerCase()];
  if (!ext) return json({ error: "Please upload a JPG, PNG or PDF receipt." }, 400, origin);
  if (file.size > 10 * 1024 * 1024) return json({ error: "Receipt file is too large (max 10MB)." }, 400, origin);

  const aRes = await supaAdmin(env, `appointments?id=eq.${id}&select=id,created_at,payments(id,method,status,provider)`, { method: "GET" });
  const appt = aRes.ok ? ((await aRes.json()) as any[])?.[0] : null;
  const pay = appt?.payments?.find((p: any) => p.method === "bank_transfer" && p.provider !== "cash");
  if (!appt || !pay) return json({ error: "Booking not found." }, 404, origin);
  if (pay.status === "paid") return json({ error: "This booking is already paid." }, 409, origin);
  if (Date.now() - new Date(appt.created_at).getTime() > 24 * 3600e3) return json({ error: "Please send your receipt on WhatsApp instead." }, 403, origin);

  const path = `${id}/${Date.now()}.${ext}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/${path}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": file.type },
    body: await file.arrayBuffer(),
  });
  if (!up.ok) return json({ error: "Upload failed. Please try again." }, 500, origin);
  const nowIso = new Date().toISOString();
  const upd = await supaAdmin(env, `payments?id=eq.${pay.id}`, { method: "PATCH", body: JSON.stringify({ receipt_path: path, receipt_status: "submitted", uploaded_at: nowIso, updated_at: nowIso }) });
  if (!upd.ok) return json({ error: "Upload saved but could not be linked. Please send it on WhatsApp too." }, 500, origin);
  return json({ ok: true, path }, 200, origin);
};
