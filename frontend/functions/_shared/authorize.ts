// Centralized SERVER-SIDE authorization -- role/permission/ownership checks, layered
// on top of auth.ts's identity check. Every future protected endpoint should reach
// for requireRole/requireOwnerOrRole/requireSuperAdmin here rather than re-implementing
// its own role logic, so RBAC behaves identically everywhere (locked rule, section 33).
//
// Depends on migration 0005 (user_roles / staff_permissions) being applied. Until then,
// getUserRoles/getStaffPermissions simply return [] (the underlying REST call 404s and
// is treated as "no roles found") -- every requireRole/requireOwnerOrRole call therefore
// fails closed (403), never open. That is deliberate: safe to deploy this file before
// the migration runs, because nothing it protects can be reached prematurely.
import { requireAuth, AuthUser, json } from "./auth";
import { supaAdmin, AdminEnv } from "./adminAuth";

export type AppRole = "client" | "staff" | "admin" | "super_admin";
export type AuthzEnv = AdminEnv; // same SUPABASE_SERVICE_ROLE_KEY secret, reused, not duplicated

// Server-side only -- uses the service-role key (via the existing supaAdmin() helper),
// never the caller's own session, so RLS's self-access-only policies on user_roles are
// bypassed here exactly the same deliberate way an admin dashboard already bypasses them.
export async function getUserRoles(env: AuthzEnv, userId: string): Promise<AppRole[]> {
  const res = await supaAdmin(env, `user_roles?user_id=eq.${userId}&select=role`);
  if (!res.ok) return [];
  const rows = (await res.json().catch(() => [])) as { role: AppRole }[];
  return Array.isArray(rows) ? rows.map((r) => r.role) : [];
}

export async function getStaffPermissions(env: AuthzEnv, userId: string): Promise<string[]> {
  const res = await supaAdmin(env, `staff_permissions?user_id=eq.${userId}&select=permission_key`);
  if (!res.ok) return [];
  const rows = (await res.json().catch(() => [])) as { permission_key: string }[];
  return Array.isArray(rows) ? rows.map((r) => r.permission_key) : [];
}

// Authenticate + require at least one of the given roles.
export async function requireRole(
  request: Request,
  env: AuthzEnv,
  allowed: AppRole[]
): Promise<{ user: AuthUser; roles: AppRole[] } | Response> {
  const origin = request.headers.get("Origin");
  const user = await requireAuth(request);
  if (user instanceof Response) return user;
  const roles = await getUserRoles(env, user.id);
  if (!roles.some((r) => allowed.includes(r))) {
    return json({ error: "This account is not authorized for this action." }, 403, origin);
  }
  return { user, roles };
}

// The IDOR/BOLA guard: pass the resource's real owner id (e.g. customers.auth_user_id,
// a future inquiries.user_id/collaborations.user_id) and this returns 403 for anyone
// who is neither that owner nor an authorized staff/admin/super_admin. Never derive
// resourceOwnerId from anything the client sent -- always look it up server-side first.
export async function requireOwnerOrRole(
  request: Request,
  env: AuthzEnv,
  resourceOwnerId: string | null,
  allowedStaffRoles: AppRole[]
): Promise<{ user: AuthUser; roles: AppRole[]; isOwner: boolean } | Response> {
  const origin = request.headers.get("Origin");
  const user = await requireAuth(request);
  if (user instanceof Response) return user;
  const isOwner = !!resourceOwnerId && resourceOwnerId === user.id;
  const roles = await getUserRoles(env, user.id);
  const hasRole = roles.some((r) => allowedStaffRoles.includes(r));
  if (!isOwner && !hasRole) {
    return json({ error: "You do not have access to this resource." }, 403, origin);
  }
  return { user, roles, isOwner };
}

// super_admin-only escalation guard. Ordinary admins must never reach this (locked
// rule: "Do not allow ordinary admins to escalate themselves to super_admin") --
// role/permission GRANTS should always be wrapped in this, never in requireRole
// with "admin" included.
export async function requireSuperAdmin(request: Request, env: AuthzEnv) {
  return requireRole(request, env, ["super_admin"]);
}
