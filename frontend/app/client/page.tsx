"use client";
// Client portal landing page -- where the "Client" tab on /login sends a signed-in
// visitor. Minimal on purpose: this is the real destination the login/register/reset
// pages already point at (previously a 404 -- those pages existed but this one never
// did). Bookings/inquiries/messages are future phases; for now this just proves the
// account is real and signed in, and gives a way to sign out.
//
// Client-side auth check only (this is a static-exported page, no server session) --
// same pattern as the CMS's own admin gate: render nothing sensitive until a session is
// confirmed, and send anyone without one back to /login rather than showing an empty
// shell.
import { useEffect, useState } from "react";
import { getSession, getUser, signOut, type User } from "@/lib/authClient";

export default function ClientPortalPage() {
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      const u = await getUser();
      if (!cancelled) {
        setUser(u);
        setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return (
      <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }} />
    );
  }

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Welcome{user?.email ? `, ${user.email}` : ""}</h1>
        <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
          You're signed in. Your bookings, inquiries and messages will appear here as those
          features go live -- for now, get in touch directly and we'll take care of it.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/contact" style={{ background: "var(--accent-primary, #8B5CF6)", color: "#fff", padding: "12px 24px", borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>Contact Us</a>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            style={{ background: "none", border: "1px solid var(--border-subtle, #2D1F45)", color: "inherit", padding: "12px 24px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
