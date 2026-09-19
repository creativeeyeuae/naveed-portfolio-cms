// Shared helper for every admin-only Pages Function below.
//
// Why this exists: the CMS's "?admin=1" PIN gate is a client-side convenience lock only --
// the PIN value itself is fetched by every visitor's browser as part of the public
// site_settings sync, so it can never be trusted to protect a real backend action. Approving
// or rejecting a payment needs a REAL credential that isn't baked into the public bundle.
// We reuse Supabase Auth (already part of this project, per the standing "don't duplicate
// auth" rule) for that: the admin signs in with a real email + password inside the CMS's
// new Bookings tab, gets back a signed session access token from Supabase itself, and that
// token -- never the PIN -- is what every request below must present. We verify it by asking
// Supabase's own /auth/v1/user endpoint who it belongs to (Supabase checks the signature;
// we never need to parse/verify the JWT ourselves), then check that email against a single
// allow-listed admin address kept only as a server-side secret.
//
// SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAIL are Cloudflare Pages secrets (set via
// `wrangler pages secret put ...` -- see the deploy notes) and are never sent to the browser.
//
// ADMIN_EMAIL holds one or more allow-listed addresses, comma-separated (e.g.
// "owner@example.com,admin@example.com") -- originally a single address, extended here to
// a list so a second/backup admin account can be granted access without displacing the
// first. A value with no commas still works exactly as before (a one-item list).

export type AdminEnv = {
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_EMAIL: string;
};

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
// This is the public/publishable key, not a secret -- same one already shipped in the
// frontend bundle. Used here only to ask Supabase "who does this session token belong to".
const SUPABASE_ANON_KEY = "sb_publishable_g1v9wJwn_CYnK8vbikzVVg_97kvEoT1";

export function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// Verifies the caller's Supabase session token and that it belongs to the allow-listed admin.
// Returns the admin's email on success, or a ready-to-return Response on failure.
export async function requireAdmin(
  request: Request,
  env: AdminEnv
): Promise<{ email: string } | Response> {
  const origin = request.headers.get("Origin");
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Sign in required." }, 401, origin);

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!who.ok) return json({ error: "Your session has expired -- please sign in again." }, 401, origin);
  const user = (await who.json()) as { email?: string };

  const adminEmails = (env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const callerEmail = (user.email || "").trim().toLowerCase();
  if (!adminEmails.length || !adminEmails.includes(callerEmail)) {
    return json({ error: "This account is not authorized for admin actions." }, 403, origin);
  }
  return { email: user.email! };
}

// A small wrapper around Supabase's REST API using the service-role key -- server-side only,
// never returned to the browser, and only reachable through the admin check above.
export async function supaAdmin(
  env: AdminEnv,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
}
