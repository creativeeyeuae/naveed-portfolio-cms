"use client";
// Self-registration. Deliberately has NO role field anywhere -- registration only ever
// collects email+password. The default 'client' role is assigned entirely server-side
// by the database trigger (migration 0005's handle_new_user_centralized_auth), the
// moment Supabase creates the auth.users row. There is no code path here, or anywhere
// on the client, that could submit or influence a role (locked rule, section 7.5/16).
import { useState } from "react";
import { signUp } from "@/lib/authClient";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"verify" | "signed-in" | "existing" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const { data, error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error.message || "Could not create your account.");
      return;
    }
    if (data.session) {
      setDone("signed-in");
      window.location.href = "/client";
      return;
    }
    // Supabase's anti-account-enumeration behavior: signing up with an email that
    // ALREADY has a confirmed account returns a user object with no session and no
    // error, but an empty `identities` array -- and it never actually sends an email
    // in this case. Without this check we'd show "Check your email" for a mail that
    // was never sent, which is exactly what was silently happening before.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setDone("existing");
      return;
    }
    setDone("verify");
  }

  if (done === "existing") {
    return (
      <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>You already have an account</h1>
          <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 24 }}>
            An account already exists for <strong>{email}</strong> -- no new email is sent in this case. Sign in below, or reset your password if you don't remember it.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <a href="/login" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 6, background: "var(--accent-primary, #8B5CF6)", color: "#fff", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
            <a href="/reset-password" style={{ display: "inline-block", padding: "12px 24px", color: "var(--accent-primary, #8B5CF6)", textDecoration: "underline" }}>Forgot password?</a>
          </div>
        </div>
      </main>
    );
  }

  if (done === "verify") {
    return (
      <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Check your email</h1>
          <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14 }}>
            We sent a verification link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <a href="/login" style={{ display: "inline-block", marginTop: 24, color: "var(--accent-primary, #8B5CF6)", textDecoration: "underline" }}>Back to sign in</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Create your account</h1>
        <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 32 }}>
          One login for bookings, inquiries, collaborations and messages.
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
          <input type="password" required placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
          <input type="password" required placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ padding: "12px 14px", borderRadius: 6, background: "var(--accent-primary, #8B5CF6)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <div style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted, #A892C6)" }}>
          Already have an account? <a href="/login" style={{ color: "inherit", textDecoration: "underline" }}>Sign in</a>
        </div>
      </div>
    </main>
  );
}
