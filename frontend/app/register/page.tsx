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
  const [done, setDone] = useState<"verify" | "signed-in" | null>(null);

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
    setDone("verify");
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
