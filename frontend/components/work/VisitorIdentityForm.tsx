"use client";
// Shared "who are you" mini-form used by both ProjectEngagement (before a first like/comment)
// and PermissionRequestModal (before submitting a permission request). No password -- name +
// email + WhatsApp only, matching the spec exactly. Kept intentionally tiny/dumb: it just
// collects and validates the three fields, then hands them to the caller's onSubmit.
import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 13,
  background: "var(--bg-surface-1, #140D21)",
  border: "1px solid var(--border-subtle, #2D1F45)",
  borderRadius: 4,
  color: "var(--text-primary, #fff)",
  marginBottom: 10,
  boxSizing: "border-box",
};

export default function VisitorIdentityForm({
  onSubmit,
  busy,
  error,
  intro,
}: {
  onSubmit: (name: string, email: string, whatsapp: string) => void;
  busy: boolean;
  error?: string;
  intro?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [localErr, setLocalErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) {
      setLocalErr("Please fill in your name, email and WhatsApp number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalErr("Please enter a valid email address.");
      return;
    }
    setLocalErr("");
    onSubmit(name.trim(), email.trim(), whatsapp.trim());
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 8 }}>
      {intro && <p style={{ fontSize: 12, color: "var(--text-muted, #A892C6)", marginBottom: 12, lineHeight: 1.6 }}>{intro}</p>}
      <input style={inputStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={inputStyle} type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={inputStyle} placeholder="WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      {(localErr || error) && <div style={{ fontSize: 12, color: "#e74c3c", marginBottom: 10 }}>{localErr || error}</div>}
      <button
        type="submit"
        disabled={busy}
        style={{
          background: "var(--accent-primary, #8B5CF6)",
          border: "none",
          color: "#fff",
          padding: "10px 22px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
          borderRadius: 2,
        }}
      >
        {busy ? "..." : "Continue"}
      </button>
    </form>
  );
}
