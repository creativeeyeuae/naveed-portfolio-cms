"use client";
// Step 1 of Supabase's built-in reset flow -- request the email. No custom password
// storage or reset-token handling anywhere in this project; Supabase owns the whole
// mechanism (locked rule, section 7).
import { useState } from "react";
import { requestPasswordReset } from "@/lib/authClient";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    // Always show the same "sent" state, whether or not the email exists --
    // never reveal which emails have accounts (avoids account enumeration).
    setSent(true);
  }

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: sent ? "center" : "left" }}>
        {sent ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Check your email</h1>
            <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14 }}>
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Reset your password</h1>
            <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 32 }}>
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
              <button type="submit" disabled={loading}
                style={{ padding: "12px 14px", borderRadius: 6, background: "var(--accent-primary, #8B5CF6)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <a href="/login" style={{ display: "inline-block", marginTop: 24, color: "var(--accent-primary, #8B5CF6)", textDecoration: "underline", fontSize: 13 }}>Back to sign in</a>
      </div>
    </main>
  );
}
