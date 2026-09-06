// Verifies a Supabase-issued JWT on protected routes and attaches the
// resolved role (admin | client) to the request context.
import type { MiddlewareHandler } from "hono";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "../database/client";

export const requireAuth: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing bearer token" }, 401);
  }
  const token = authHeader.slice("Bearer ".length);

  // Verifying a caller-supplied JWT via auth.getUser() only needs the public
  // anon/publishable key -- it does not require (and must never use) the
  // Supabase service-role key, which bypasses RLS and is reserved for
  // privileged, server-only operations this route does not perform.
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("authUserId", data.user.id);
  c.set("authEmail", data.user.email ?? "");
  await next();
};

export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // Assumes requireAuth ran first and the `users` table role has been
  // resolved and cached client-side; for a Worker-per-request model we
  // re-check against Prisma here.
  const { getPrismaClient } = await import("../database/client");
  const prisma = getPrismaClient(c.env);
  const authUserId = c.get("authUserId" as never) as string;

  const user = await prisma.user.findUnique({ where: { authId: authUserId } });
  if (!user || user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
};
