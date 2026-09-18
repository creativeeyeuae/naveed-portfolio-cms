"use client";
// Destination of the signup confirmation link (registration's emailRedirectTo).
// Supabase's client SDK detects the confirmation tokens in the URL automatically on
// load and establishes a session; this page just waits for that and reports the result.
import { useEffect, useState } from "react";
import { getSession } from "@/lib/authClient";

export default function VerifyEmailPage() {
  const [state, setState] = useState<"checking" | "verified" | "unclear">("checking");

  useEffect(() => {
    const t = setTimeout(async () => {
      const session = await getSession();
      setState(session ? "verified" : "unclear");
    }, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        {state === "checking" && <p style={{ color: "var(--text-muted, #A892C6)" }}>Verifying your email...</p>}
        {state === "verified" && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Email verified</h1>
            <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 24 }}>Your account is ready.</p>
            <a href="/client" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 6, background: "var(--accent-primary, #8B5CF6)", color: "#fff", fontWeight: 600, textDecoration: "none" }}>
              Go to your account
            </a>
          </>
        )}
        {state === "unclear" && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Almost there</h1>
            <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 14, marginBottom: 24 }}>
              If you clicked the link in your email, your account should now be verified -- sign in below. If it's not working, the link may have expired; you can request a new one from the sign-in page.
            </p>
            <a href="/login" style={{ color: "var(--accent-primary, #8B5CF6)", textDecoration: "underline" }}>Sign in</a>
          </>
        )}
      </div>
    </main>
  );
}
