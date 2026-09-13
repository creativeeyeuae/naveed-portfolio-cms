// POST /api/permission-requests  (requires a visitor session -- their name/email/whatsapp
//        already on file from /api/visitor/identify is what gets stored as the requester)
//   body: { projectId, projectName, imageId, imageUrl, usageTypes:[], usageUrl?,
//            usageDescription?, copyrightAcknowledged }
// GET  /api/permission-requests?mine=1  -> the visitor's OWN requests only (never anyone
//        else's), with status + (for approved/rejected) the outcome -- never admin_notes.
//
// Manual-approval-only: every insert starts 'pending'. Nothing here can set status to
// approved/rejected -- that only happens in functions/api/admin/permission-requests.ts,
// behind requireAdmin.
import { supaAdmin, json, corsHeaders } from "../_shared/adminAuth";
import { getVisitorIdFromRequest, type VisitorEnv } from "../_shared/visitorAuth";

type Env = VisitorEnv & { SUPABASE_SERVICE_ROLE_KEY: string };
const USAGE_TYPES = ["Website", "Social Media", "Advertising", "Editorial / Publication", "Print", "Commercial Project", "Personal Use", "Other"];

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ requests: [] }, 200, origin);

  const res = await supaAdmin(
    env as any,
    `image_permission_requests?visitor_id=eq.${visitorId}&select=id,project_id,project_name_snapshot,image_url_snapshot,status,usage_types,rejection_reason,approved_usage,credit_required,credit_text,created_at,reviewed_at&order=created_at.desc`
  );
  if (!res.ok) return json({ requests: [] }, 200, origin);
  const rows = (await res.json()) as any[];
  const requests = rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    projectName: r.project_name_snapshot,
    imageUrl: r.image_url_snapshot,
    status: r.status,
    usageTypes: r.usage_types,
    rejectionReason: r.status === "rejected" ? r.rejection_reason : undefined,
    approvedUsage: r.status === "approved" ? r.approved_usage : undefined,
    creditRequired: r.status === "approved" ? r.credit_required : undefined,
    creditText: r.status === "approved" ? r.credit_text : undefined,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  }));
  return json({ requests }, 200, origin);
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ error: "Please identify yourself first.", needsIdentity: true }, 401, origin);

  const body = (await request.json().catch(() => ({}))) as any;
  const projectId = (body.projectId || "").trim();
  const imageUrl = (body.imageUrl || "").trim();
  const usageTypes: string[] = Array.isArray(body.usageTypes) ? body.usageTypes.filter((t: string) => USAGE_TYPES.includes(t)) : [];

  if (!projectId || !imageUrl) return json({ error: "The image and project could not be identified." }, 400, origin);
  if (usageTypes.length === 0) return json({ error: "Select at least one intended usage." }, 400, origin);
  if (body.copyrightAcknowledged !== true) {
    return json({ error: "You must acknowledge the copyright notice to submit a request." }, 400, origin);
  }

  const visRes = await supaAdmin(env as any, `visitors?select=name,email,whatsapp&id=eq.${visitorId}`);
  const [visitor] = visRes.ok ? ((await visRes.json()) as any[]) : [];
  if (!visitor) return json({ error: "Your session has expired -- please identify yourself again.", needsIdentity: true }, 401, origin);

  const res = await supaAdmin(env as any, "image_permission_requests", {
    method: "POST",
    body: JSON.stringify({
      project_id: projectId,
      image_id: body.imageId || null,
      project_name_snapshot: body.projectName || null,
      image_url_snapshot: imageUrl,
      visitor_id: visitorId,
      requester_name: visitor.name,
      requester_email: visitor.email,
      requester_whatsapp: visitor.whatsapp,
      usage_types: usageTypes,
      usage_url: (body.usageUrl || "").trim() || null,
      usage_description: (body.usageDescription || "").trim() || null,
      copyright_acknowledged: true,
      status: "pending",
    }),
  });
  if (!res.ok) return json({ error: "Could not submit your request.", detail: await res.text() }, 500, origin);
  const [created] = (await res.json()) as { id: string }[];
  return json({ ok: true, id: created?.id }, 200, origin);
};
