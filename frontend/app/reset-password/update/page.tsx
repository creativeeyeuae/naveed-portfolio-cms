"use client";
// Step 2 -- lands here from the emailed reset link, which establishes a recovery
// session automatically (Supabase's client SDK reads it from the URL on page load).
import { useEffect, useState } from "react";
import { getSession, updatePassword } from "@/lib/authClient";

export default function UpdatePasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Give the SDK a moment to process the recovery link's URL fragment.
    const t = setTimeout(async () => {
      const session = await getSession();
      setReady(!!session);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) return setError(error.message || "Could not update your password.");
    setDone(true);
  }

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Set a new password</h1>
        {done ? (
          <>
            <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 20 }}>Your password has been updated.</p>
            <a href="/login" style={{ color: "var(--accent-primary, #8B5CF6)", textDecoration: "underline" }}>Sign in</a>
          </>
        ) : !ready ? (
          <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14 }}>
            This reset link is invalid or has expired. <a href="/reset-password" style={{ color: "var(--accent-primary, #8B5CF6)", textDecoration: "underline" }}>Request a new one</a>.
          </p>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
            <input type="password" required placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
            <input type="password" required placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
            {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ padding: "12px 14px", borderRadius: 6, background: "var(--accent-primary, #8B5CF6)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
