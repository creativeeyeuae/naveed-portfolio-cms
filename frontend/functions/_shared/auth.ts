// Centralized SERVER-SIDE identity verification -- generalizes the token-verification
// logic that already existed only inside adminAuth.ts (requireAdmin), so every future
// protected Pages Function (client bookings, inquiries, collaborations, messages, ...)
// authenticates the SAME way, through this one function, instead of each endpoint
// re-implementing "check the Bearer token against Supabase" slightly differently.
//
// This file does NOT check roles/permissions -- that's authorize.ts, layered on top.
// This file does NOT replace adminAuth.ts's requireAdmin() -- that hardcoded-email
// check keeps working untouched until Phase 5's role-based path is verified end-to-end
// (locked rule, section 8). corsHeaders/json are re-exported from adminAuth.ts rather
// than duplicated, so there is exactly one copy of each.
export { corsHeaders, json } from "./adminAuth";
import { corsHeaders, json } from "./adminAuth";

export type AuthUser = { id: string; email: string };

const SUPABASE_URL = "https://ziwaocjrpbrksnepbpxi.supabase.co";
// Public/publishable key, not a secret -- same one already in the frontend bundle.
// Used only to ask Supabase "who does this session token belong to".
const SUPABASE_ANON_KEY = "sb_publishable_g1v9wJwn_CYnK8vbikzVVg_97kvEoT1";

// Verifies the caller's Supabase session token via Supabase's own /auth/v1/user
// endpoint (Supabase checks the signature; we never parse/verify the JWT ourselves --
// the same pattern adminAuth.ts already uses). Returns the real, authenticated
// {id, email}, or a ready-to-return 401 Response on failure. Never trusts anything
// the client claims about its own identity beyond this token.
export async function requireAuth(request: Request): Promise<AuthUser | Response> {
  const origin = request.headers.get("Origin");
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Sign in required." }, 401, origin);

  const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!who.ok) {
    return json({ error: "Your session has expired -- please sign in again." }, 401, origin);
  }
  const user = (await who.json()) as { id?: string; email?: string };
  if (!user.id || !user.email) {
    return json({ error: "Your session has expired -- please sign in again." }, 401, origin);
  }
  return { id: user.id, email: user.email };
}
