// POST /api/client/receipt-upload   multipart/form-data: { appointment_id, file }
//
// Lets a signed-in client (re-)upload a payment receipt for one of THEIR OWN bookings --
// e.g. after a first receipt was rejected (see admin/payments/[id]/reject.ts). Ownership
// of the appointment is verified server-side against the caller's own customer_id before
// anything is written, so a signed-in client can never touch another customer's payment
// row through this endpoint, even by guessing an appointment id.
import { requireUser, resolveOwnCustomerId, supaService, json, corsHeaders, type ClientEnv } from "../../_shared/clientAuth";

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<ClientEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const customerId = await resolveOwnCustomerId(env, user);
  if (!customerId) return json({ error: "No booking found for your account." }, 404, origin);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid upload." }, 400, origin);
  }
  const appointmentId = String(form.get("appointment_id") || "");
  const file = form.get("file") as unknown as File | null;
  if (!appointmentId || !file) return json({ error: "Missing appointment or file." }, 400, origin);

  const okTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (file.type && !okTypes.includes(file.type)) {
    return json({ error: "Please upload a valid payment receipt (JPG, PNG or PDF)." }, 400, origin);
  }
  if (file.size > 10 * 1024 * 1024) return json({ error: "Receipt file is too large (max 10MB)." }, 400, origin);

  // Ownership check -- this appointment must belong to the caller's own customer_id.
  const apptRes = await supaService(env, `appointments?id=eq.${appointmentId}&customer_id=eq.${customerId}&select=id`, {
    method: "GET",
  });
  const apptRows = apptRes.ok ? ((await apptRes.json()) as any[]) : [];
  if (!apptRows?.[0]) return json({ error: "Booking not found." }, 404, origin);

  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${appointmentId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/${path}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: bytes,
  });
  if (!upRes.ok) return json({ error: "Could not upload receipt.", detail: await upRes.text() }, 500, origin);

  // Same fields the original (anonymous, at-booking-time) upload flow sets -- see
  // uploadReceiptFile() in app/page.tsx. Only admin approve/reject ever changes
  // payments.status; a re-upload here deliberately leaves it alone.
  const nowIso = new Date().toISOString();
  const updRes = await supaService(env, `payments?appointment_id=eq.${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ receipt_path: path, receipt_status: "submitted", uploaded_at: nowIso }),
  });
  if (!updRes.ok) {
    return json({ error: "Receipt uploaded, but the booking couldn't be updated.", detail: await updRes.text() }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
};
