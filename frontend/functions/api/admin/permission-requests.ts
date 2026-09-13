// GET  /api/admin/permission-requests            -> every image permission request, any
//        status, with full requester + image context, for admin review.
// POST /api/admin/permission-requests  { requestId, action: "approve"|"reject",
//        adminNotes?, rejectionReason?, creditRequired?, creditText?, approvedUsage? }
//
// Manual-approval-only, exactly per spec: nothing here (or anywhere else in this codebase)
// auto-grants a request. Every approve/reject is a deliberate admin action, gated by the
// same requireAdmin/supaAdmin pattern as every other admin function, and is recorded with
// reviewed_at/reviewed_by so there's a real audit trail.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(
    env,
    "image_permission_requests?select=id,project_id,project_name_snapshot,image_url_snapshot,requester_name,requester_email,requester_whatsapp,usage_types,usage_url,usage_description,copyright_acknowledged,status,admin_notes,rejection_reason,credit_required,credit_text,approved_usage,created_at,reviewed_at,reviewed_by&order=created_at.desc&limit=500"
  );
  if (!res.ok) return json({ error: "Could not load permission requests." }, 500, origin);
  const rows = (await res.json()) as any[];
  const requests = rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    projectName: r.project_name_snapshot,
    imageUrl: r.image_url_snapshot,
    requesterName: r.requester_name,
    requesterEmail: r.requester_email,
    requesterWhatsapp: r.requester_whatsapp,
    usageTypes: r.usage_types,
    usageUrl: r.usage_url,
    usageDescription: r.usage_description,
    copyrightAcknowledged: r.copyright_acknowledged,
    status: r.status,
    adminNotes: r.admin_notes,
    rejectionReason: r.rejection_reason,
    creditRequired: r.credit_required,
    creditText: r.credit_text,
    approvedUsage: r.approved_usage,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  }));
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  return json({ requests, pendingCount }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    action?: string;
    adminNotes?: string;
    rejectionReason?: string;
    creditRequired?: boolean;
    creditText?: string;
    approvedUsage?: string;
  };
  const { requestId, action } = body;
  if (!requestId || !["approve", "reject"].includes(action || "")) {
    return json({ error: "requestId and a valid action (approve|reject) are required." }, 400, origin);
  }
  if (action === "reject" && !(body.rejectionReason || "").trim()) {
    return json({ error: "A rejection reason is required." }, 400, origin);
  }

  const update: Record<string, unknown> = {
    status: action === "approve" ? "approved" : "rejected",
    admin_notes: (body.adminNotes || "").trim() || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: admin.email,
  };
  if (action === "approve") {
    update.approved_usage = (body.approvedUsage || "").trim() || null;
    update.credit_required = body.creditRequired === true;
    update.credit_text = body.creditRequired === true ? (body.creditText || "").trim() || "Photography: Naveed Anjum / Creative Fusion LLC" : null;
    update.rejection_reason = null;
  } else {
    update.rejection_reason = (body.rejectionReason || "").trim();
    update.approved_usage = null;
    update.credit_required = null;
    update.credit_text = null;
  }

  const res = await supaAdmin(env, `image_permission_requests?id=eq.${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
  if (!res.ok) return json({ error: "Could not update the request.", detail: await res.text() }, 500, origin);
  return json({ ok: true, status: update.status }, 200, origin);
};
