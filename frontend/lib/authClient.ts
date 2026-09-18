// Centralized client-side auth -- the ONE place /login, /register, /reset-password,
// and (later) /client and /admin/login all call, so those flows can never drift into
// separate clientAuth/adminAuth/staffAuth implementations (locked rule, section 33).
// Built on the existing lib/supabase.ts browser client (anon key only, same as every
// other client-side Supabase call in this project) -- no new client is created here.
//
// This never sends or accepts a role. Registration always lands a brand-new Supabase
// Auth user with nothing but email+password; the DATABASE trigger from migration 0005
// (handle_new_user_centralized_auth) is what assigns the default 'client' role, entirely
// server-side, the moment the auth.users row is created. There is no code path here that
// could let a client choose 'staff'/'admin'/'super_admin' -- the concept doesn't exist on
// this side of the app at all.
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type { Session, User };

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// The Bearer token every protected Pages Function (via functions/_shared/auth.ts)
// expects. Returns null when signed out -- callers should redirect to /login rather
// than send an unauthenticated request.
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/verify-email` },
  });
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export type AppRole = "client" | "staff" | "admin" | "super_admin";

// The current session's own roles (migration 0005's user_roles table). RLS's
// "own_roles_select" policy means this can only ever return the signed-in user's own
// rows -- never anyone else's -- so it's safe to call from any client component that
// needs to know "does this account have admin access" or similar, without a server round
// trip. Returns [] (never throws) when signed out or on any read failure -- callers
// should treat that as "no elevated access", the same fail-closed default authorize.ts
// uses server-side.
export async function getMyRoles(): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role");
  if (error || !data) return [];
  return data.map((r: { role: AppRole }) => r.role);
}

export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password/update`,
  });
}

// Only usable once the recovery link has established a session on this page
// (Supabase's client SDK does this automatically from the URL it redirects to).
export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}
