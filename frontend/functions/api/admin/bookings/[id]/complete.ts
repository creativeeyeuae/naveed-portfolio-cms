// POST /api/admin/bookings/:id/complete
//
// Marks a confirmed booking as completed once the shoot/delivery is done. Only valid from
// "confirmed" -- catches the common mistake of completing a booking that was never paid.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../../_shared/adminAuth";
import { forwardClientWhatsAppAlert } from "../../../../_shared/liveChatWhatsapp";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<AdminEnv> = async (ctx) => {
  const { request, env, params } = ctx;
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const appointmentId = params.id as string;

  const getRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}&select=*,customers(full_name,whatsapp,phone)`, {
    method: "GET",
  });
  const rows = (await getRes.json()) as any[];
  const appt = rows?.[0];
  if (!appt) return json({ error: "Booking not found." }, 404, origin);
  if (appt.status === "completed") return json({ error: "Already completed." }, 409, origin);
  if (appt.status !== "confirmed") {
    return json({ error: "Only a confirmed booking can be marked complete." }, 409, origin);
  }

  const nowIso = new Date().toISOString();
  const patchRes = await supaAdmin(env, `appointments?id=eq.${appointmentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed", updated_at: nowIso }),
  });
  if (!patchRes.ok) return json({ error: "Could not complete booking.", detail: await patchRes.text() }, 500, origin);

  await supaAdmin(env, "appointment_status_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      appointment_id: appointmentId,
      old_status: "confirmed",
      new_status: "completed",
      changed_by: `admin:${admin.email}`,
      reason: "Marked complete by admin",
    }),
  });

  await supaAdmin(env, "audit_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor: `admin:${admin.email}`,
      action: "booking_completed",
      entity_type: "appointment",
      entity_id: appointmentId,
      details: {},
    }),
  });

  if (appt.customer_id) {
    await supaAdmin(env, "client_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        customer_id: appt.customer_id,
        sender: "admin",
        sender_name: admin.email,
        body: `Your booking (${appt.appointment_ref || appointmentId.slice(0, 8)}) is now marked complete. Thank you!`,
        is_read_by_admin: true,
        is_read_by_client: false,
      }),
    });

    // Best-effort: also let the client know on their own WhatsApp. Never blocks the
    // completion itself.
    try {
      const cust = appt.customers;
      await forwardClientWhatsAppAlert(
        env,
        cust?.whatsapp || cust?.phone,
        `🎉 Hi ${cust?.full_name || ""}, your booking (${appt.appointment_ref || appointmentId.slice(0, 8)}) is now marked *complete*. Thank you for booking with Naveed Anjum!`,
        cust?.full_name
      );
    } catch {}
  }

  return json({ ok: true }, 200, origin);
};
