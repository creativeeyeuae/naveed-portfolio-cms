"use client";
// Small client-side hook wrapping the visitor identity endpoints (functions/api/visitor/*.ts).
// Used by ProjectEngagement (Likes/Comments) and PermissionRequestModal -- both need to know
// "has this browser already identified itself" and both need a way to identify it (name/
// email/whatsapp, no password) before their first write. The actual session is a secure,
// HttpOnly, server-signed cookie (see functions/_shared/visitorAuth.ts); this hook never
// touches that cookie directly -- it only calls the endpoints and tracks the result in state.
import { useCallback, useEffect, useState } from "react";

export type VisitorIdentityState = {
  loading: boolean;
  identified: boolean;
  name: string;
  error: string;
  busy: boolean;
  identify: (name: string, email: string, whatsapp: string) => Promise<boolean>;
};

export function useVisitorIdentity(): VisitorIdentityState {
  const [loading, setLoading] = useState(true);
  const [identified, setIdentified] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/visitor/me", { credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.signedIn) {
          setIdentified(true);
          setName(data.name || "");
        }
      } catch {
        // Network hiccup -- treat as "not identified yet" rather than blocking the page.
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const identify = useCallback(async (nm: string, email: string, whatsapp: string): Promise<boolean> => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/visitor/identify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nm, email, whatsapp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not save your details -- please try again.");
        setBusy(false);
        return false;
      }
      setIdentified(true);
      setName(data.name || nm);
      setBusy(false);
      return true;
    } catch {
      setError("Could not reach the server -- please check your connection and try again.");
      setBusy(false);
      return false;
    }
  }, []);

  return { loading, identified, name, error, busy, identify };
}
