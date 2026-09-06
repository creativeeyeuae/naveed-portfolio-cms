import { Hono } from "hono";
import type { Env } from "../database/client";

export const adminAuth = new Hono<{ Bindings: Env }>();

// Constant-time-ish comparison to avoid trivial timing side-channels on the PIN check.
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// POST /admin-auth/verify-pin
// The PIN itself lives ONLY in the Worker's secret bindings (wrangler secret put ADMIN_PIN)
// and is never read into, stored in, or returned to the client. If no PIN has been
// explicitly configured, every attempt is refused (fail-secure) rather than falling back
// to any default/guessable value.
adminAuth.post("/verify-pin", async (c) => {
  const configuredPin = c.env.ADMIN_PIN;

  if (!configuredPin || configuredPin.trim() === "") {
    return c.json({ error: "Admin PIN is not configured on the server" }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const submitted = typeof body?.pin === "string" ? body.pin : "";

  if (!submitted || !safeCompare(submitted, configuredPin)) {
    return c.json({ error: "Invalid PIN" }, 401);
  }

  return c.json({ ok: true });
});
