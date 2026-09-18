"use client";
// Shared login for EVERYONE -- clients, staff, admins, super admins (locked rule,
// section 7: "one shared authentication flow"). Authorization (which role you have)
// is decided server-side/by role lookup, after this succeeds -- this page only ever
// proves identity via the ONE signInWithPassword call below, for both tabs.
//
// Two tabs, Naveed's request: "Client" (existing behaviour, unchanged -- signs in and
// goes to /client) and "Admin" (same sign-in call, but then checks migration 0005's
// user_roles table before letting the visitor through; a real client account that
// happens to try the Admin tab authenticates fine but is immediately signed back out
// and told it has no admin access, exactly like the CMS's own ?admin=1 gate now does).
import { useState } from "react";
import { signInWithPassword, signOut, getMyRoles } from "@/lib/authClient";

const ADMIN_ROLES = ["admin", "staff", "super_admin"];

export default function LoginPage() {
  const [tab, setTab] = useState<"client" | "admin">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchTab(next: "client" | "admin") {
    setTab(next);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    if (error) {
      setLoading(false);
      setError(error.message || "Sign in failed. Check your email and password.");
      return;
    }
    if (tab === "admin") {
      const roles = await getMyRoles();
      if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
        await signOut();
        setLoading(false);
        setError("This account doesn't have admin access.");
        return;
      }
      window.location.href = "/?admin=1";
      return;
    }
    window.location.href = "/client";
  }

  const tabBtn = (key: "client" | "admin", label: string) => (
    <button
      type="button"
      onClick={() => switchTab(key)}
      style={{
        flex: 1,
        padding: "12px 0",
        background: "none",
        border: "none",
        borderBottom: tab === key ? "2px solid var(--accent-primary, #8B5CF6)" : "2px solid transparent",
        color: tab === key ? "var(--text-primary,#fff)" : "var(--text-muted, #A892C6)",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Sign in</h1>
        <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 28 }}>
          {tab === "admin" ? "Sign in to manage the site." : "One account for your bookings, inquiries and messages."}
        </p>
        <div style={{ display: "flex", marginBottom: 28, borderBottom: "1px solid var(--border-subtle, #2D1F45)" }}>
          {tabBtn("client", "Client")}
          {tabBtn("admin", "Admin")}
        </div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit" }} />
          {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ padding: "12px 14px", borderRadius: 6, background: "var(--accent-primary, #8B5CF6)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {tab === "client" && (
          <div style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted, #A892C6)", display: "flex", justifyContent: "space-between" }}>
            <a href="/reset-password" style={{ color: "inherit", textDecoration: "underline" }}>Forgot password?</a>
            <a href="/register" style={{ color: "inherit", textDecoration: "underline" }}>Create an account</a>
          </div>
        )}
        {tab === "admin" && (
          <div style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted, #A892C6)" }}>
            <a href="/reset-password" style={{ color: "inherit", textDecoration: "underline" }}>Forgot password?</a>
          </div>
        )}
      </div>
    </main>
  );
}
