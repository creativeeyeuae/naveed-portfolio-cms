// Shared helper for CLIENT-facing Pages Functions (functions/api/client/*) -- endpoints
// any signed-in customer can call, not just the allow-listed admin. Mirrors adminAuth.ts's
// token verification (ask Supabase's own /auth/v1/user endpoint who a session token
// belongs to -- Supabase checks the signature, we never parse/verify the JWT ourselves)
// but has NO admin allow-list check: any real Supabase Auth session is accepted here.
//
// The caller is still only ever given access to THEIR OWN data. Every endpoint that uses
// this file re-derives the caller's own customers.id server-side via resolveOwnCustomerId
// (never accepts a customer/appointment id the browser supplies as "this is who I am") --
// the same "server re-derives identity, never trusts the client" pattern adminAuth.ts
// already established for the admin side.
//
// SUPABASE_SERVICE_ROLE_KEY is the existing Cloudflare Pages secret already used by
// adminAuth.ts -- no new secret is introduced.

export type ClientEnv = { SUPABASE_SERVICE_ROLE_KEY: string };

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
// Public/publishable key, not a secret -- same one already shipped in the frontend bundle.
// Used only to ask Supabase "who does this session token belong to".
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

// Verifies the caller's Supabase session token belongs to a real, currently signed-in
// user. Unlike requireAdmin, there is no allow-list -- ANY authenticated account passes.
// Returns their auth user id + email on success, or a ready-to-return Response on failure.
export async function requireUser(request: Request): Promise<{ id: string; email: string } | Response> {
  const origin = request.headers.get("Origin");
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Sign in required." }, 401, origin);

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!who.ok) return json({ error: "Your session has expired -- please sign in again." }, 401, origin);
  const user = (await who.json()) as { id?: string; email?: string };
  if (!user.id) return json({ error: "Your session has expired -- please sign in again." }, 401, origin);
  return { id: user.id, email: user.email || "" };
}

// A small wrapper around Supabase's REST API using the service-role key -- server-side
// only, never returned to the browser, and only reachable through requireUser() above.
export async function supaService(
  env: ClientEnv,
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

// Resolves the signed-in user's own customers.id.
//
// customers.auth_user_id exists in the real database (added ahead of time, per migration
// 0005's header) but nothing has populated it yet for rows created by the public/anonymous
// booking flow (booking a shoot has never required an account). So this looks it up two
// ways: the fast path once a row IS linked, and a one-time self-healing fallback that finds
// an unlinked customer row by the caller's own verified email and links it right then --
// so every later call finds it directly via auth_user_id. Never trusts a client-supplied
// email; only ever the email Supabase's own /auth/v1/user just verified for this token.
export async function resolveOwnCustomerId(
  env: ClientEnv,
  user: { id: string; email: string }
): Promise<string | null> {
  let res = await supaService(env, `customers?auth_user_id=eq.${user.id}&select=id&limit=1`, { method: "GET" });
  if (res.ok) {
    const rows = (await res.json()) as any[];
    if (rows?.[0]?.id) return rows[0].id as string;
  }
  if (!user.email) return null;

  res = await supaService(
    env,
    `customers?email=eq.${encodeURIComponent(user.email)}&auth_user_id=is.null&select=id&limit=1`,
    { method: "GET" }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as any[];
  const customerId = rows?.[0]?.id as string | undefined;
  if (!customerId) return null;

  await supaService(env, `customers?id=eq.${customerId}`, {
    method: "PATCH",
    body: JSON.stringify({ auth_user_id: user.id }),
  });
  return customerId;
}
