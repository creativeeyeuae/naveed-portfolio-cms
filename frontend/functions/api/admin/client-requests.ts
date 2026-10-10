// /api/admin/client-requests  (admin only)
//   GET  ?status=pending|all  -> requests with booking + client
//   POST { id, action:"approve"|"reject", note?, refund_to_wallet?: boolean }
// Approve cancel  -> booking cancelled (+ optional wallet refund of the non-fee part if paid)
// Approve reschedule -> booking moved to the requested date/time (slot re-checked)
// Client is notified on WhatsApp + email either way.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";
import { emailBookingUpdate, whatsappBookingUpdate } from "../../_shared/bookingNotify";
import { forwardClientWhatsAppAlert } from "../../_shared/liveChatWhatsapp";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  const st = new URL(request.url).searchParams.get("status") || "pending";
  const r = await supaAdmin(env, `booking_requests?${st === "all" ? "" : "status=eq.pending&"}select=*,appointments(appointment_ref,service_name,package_name,booking_date,booking_time,total,status,payments(status)),customers(full_name,email,whatsapp,phone)&order=created_at.desc&limit=200`, { method: "GET" });
  if (!r.ok) return json({ error: "Requests table not found. Run database/migrations/0023_client_requests_wallet.sql in Supabase.", detail: (await r.text()).slice(0, 200) }, 500, origin);
  return json({ requests: await r.json() }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env); if (admin instanceof Response) return admin;
  let b: any; try { b = await request.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const rr = await supaAdmin(env, `booking_requests?id=eq.${encodeURIComponent(String(b.id || ""))}&select=*,appointments(*,payments(*)),customers(full_name,whatsapp,phone)`, { method: "GET" });
  const req = rr.ok ? ((await rr.json()) as any[])?.[0] : null;
  if (!req) return json({ error: "Request not found." }, 404, origin);
  if (req.status !== "pending") return json({ error: "This request was already handled." }, 409, origin);
  const appt = req.appointments; const note = String(b.note || "").slice(0, 500);
  const nowIso = new Date().toISOString();
  const decide = (status: string) => supaAdmin(env, `booking_requests?id=eq.${req.id}&status=eq.pending`, { method: "PATCH", body: JSON.stringify({ status, admin_note: note || null, decided_by: admin.email, decided_at: nowIso }) });

  if (b.action === "reject") {
    await decide("rejected");
    const phone = req.customers?.whatsapp || req.customers?.phone;
    if (phone) { try { await forwardClientWhatsAppAlert(env, phone, `Hi ${req.customers?.full_name || ""}, your ${req.kind} request for booking ${appt.appointment_ref} could not be approved.${note ? "\nNote: " + note : ""}\nReply here if you have any questions.\n— Naveed Anjum`, req.customers?.full_name); } catch {} }
    return json({ ok: true }, 200, origin);
  }
  if (b.action !== "approve") return json({ error: "Invalid action." }, 400, origin);

  if (req.kind === "reschedule") {
    const slot = await supaAdmin(env, "rpc/is_slot_taken", { method: "POST", body: JSON.stringify({ p_date: req.new_date, p_time: req.new_time }) });
    if (slot.ok && (await slot.json()) === true) return json({ error: "That new time slot is already taken. Reject or ask the client for another time." }, 409, origin);
    await supaAdmin(env, `appointments?id=eq.${appt.id}`, { method: "PATCH", body: JSON.stringify({ booking_date: req.new_date, booking_time: req.new_time, updated_at: nowIso }) });
    await supaAdmin(env, "appointment_status_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: appt.id, old_status: appt.status, new_status: appt.status, changed_by: `admin:${admin.email}`, reason: `Client reschedule approved: ${appt.booking_date} ${appt.booking_time} -> ${req.new_date} ${req.new_time}` }) }).catch(() => {});
    await decide("approved");
    try { await whatsappBookingUpdate(env, appt.id, "rescheduled"); } catch {}
    try { await emailBookingUpdate(env, appt.id, "rescheduled"); } catch {}
    return json({ ok: true }, 200, origin);
  }

  // cancel
  const reason = `Cancelled at client's request${note ? " — " + note : ""} (fee ${req.fee_percent}% per terms)`;
  await supaAdmin(env, `appointments?id=eq.${appt.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled", admin_notes: reason, updated_at: nowIso }) });
  await supaAdmin(env, "appointment_status_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ appointment_id: appt.id, old_status: appt.status, new_status: "cancelled", changed_by: `admin:${admin.email}`, reason }) }).catch(() => {});
  let refunded = 0;
  const paid = (appt.payments || []).some((p: any) => p.status === "paid");
  if (paid && b.refund_to_wallet) {
    refunded = Math.round(Number(appt.total || 0) * (100 - Number(req.fee_percent || 0))) / 100;
    if (refunded > 0) await supaAdmin(env, "wallet_transactions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ customer_id: req.customer_id, amount: refunded, kind: "refund", note: `Refund for cancelled booking ${appt.appointment_ref} (${100 - Number(req.fee_percent)}%)`, appointment_id: appt.id, created_by: admin.email }) });
  }
  await decide("approved");
  try { await whatsappBookingUpdate(env, appt.id, "cancelled", { reason }); } catch {}
  try { await emailBookingUpdate(env, appt.id, "cancelled", { reason }); } catch {}
  return json({ ok: true, refunded }, 200, origin);
};
