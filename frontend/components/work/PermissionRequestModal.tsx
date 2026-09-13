"use client";
// Image Usage Permission Request modal -- opened per-image from ProjectGallery. Auto-populates
// the project/image reference (never re-typed by the visitor), collects usage-type checkboxes,
// an optional URL/description, and a REQUIRED copyright-acknowledgement checkbox, then posts to
// functions/api/permission-requests.ts. Manual-approval-only: this never grants anything itself
// -- it only creates a 'pending' row for the admin to review in CMS > Image Requests.
import { useState } from "react";
import { useVisitorIdentity } from "@/lib/useVisitorIdentity";
import VisitorIdentityForm from "./VisitorIdentityForm";

const USAGE_TYPES = ["Website", "Social Media", "Advertising", "Editorial / Publication", "Print", "Commercial Project", "Personal Use", "Other"];

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3000,
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface-1, #140D21)",
  border: "1px solid var(--border-subtle, #2D1F45)",
  borderRadius: 6,
  padding: 28,
  maxWidth: 460,
  width: "100%",
  maxHeight: "88vh",
  overflowY: "auto",
  color: "var(--text-primary, #fff)",
};

export default function PermissionRequestModal({
  projectId,
  projectName,
  imageId,
  imageUrl,
  onClose,
}: {
  projectId: string;
  projectName: string;
  imageId?: string;
  imageUrl: string;
  onClose: () => void;
}) {
  const identity = useVisitorIdentity();
  const [usageTypes, setUsageTypes] = useState<string[]>([]);
  const [usageUrl, setUsageUrl] = useState("");
  const [usageDescription, setUsageDescription] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function toggleType(t: string) {
    setUsageTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function submit() {
    if (usageTypes.length === 0) {
      setError("Select at least one intended usage.");
      return;
    }
    if (!ack) {
      setError("You must acknowledge the copyright notice to submit a request.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/permission-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName,
          imageId,
          imageUrl,
          usageTypes,
          usageUrl: usageUrl.trim() || undefined,
          usageDescription: usageDescription.trim() || undefined,
          copyrightAcknowledged: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not submit your request.");
        setBusy(false);
        return;
      }
      // Best-effort admin push notification -- same decoupled pattern as bookings/leads/
      // receipts. Never blocks the request itself if this call fails.
      if (data.id) {
        fetch("/api/notify/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "permission_request", id: data.id }),
        }).catch(() => {});
      }
      setDone(true);
    } catch {
      setError("Could not reach the server -- please try again.");
    }
    setBusy(false);
  }

  async function onIdentified(name: string, email: string, whatsapp: string) {
    const ok = await identity.identify(name, email, whatsapp);
    if (ok) submit();
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-secondary, #E2D9F3)", textTransform: "uppercase" }}>Request Image Permission</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-muted, #A892C6)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {done ? (
          <div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted, #A892C6)" }}>
              Thank you -- your request has been submitted and is awaiting review. You'll hear back at the email/WhatsApp you provided once it's been decided.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: 14, background: "var(--accent-primary, #8B5CF6)", border: "none", color: "#fff", padding: "10px 22px", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", borderRadius: 2 }}
            >
              Close
            </button>
          </div>
        ) : !identity.loading && !identity.identified ? (
          <VisitorIdentityForm onSubmit={onIdentified} busy={identity.busy} error={identity.error} intro="Add your details first -- no password needed." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <img src={imageUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "var(--text-muted, #A892C6)", lineHeight: 1.5 }}>{projectName}</div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: "var(--text-secondary, #E2D9F3)", textTransform: "uppercase", marginBottom: 8 }}>Intended Usage *</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {USAGE_TYPES.map((t) => (
                <span
                  key={t}
                  onClick={() => toggleType(t)}
                  style={{
                    fontSize: 11,
                    padding: "6px 12px",
                    cursor: "pointer",
                    borderRadius: 20,
                    border: `1px solid ${usageTypes.includes(t) ? "var(--accent-primary, #8B5CF6)" : "var(--border-subtle, #2D1F45)"}`,
                    color: usageTypes.includes(t) ? "var(--accent-primary, #8B5CF6)" : "var(--text-muted, #A892C6)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <input
              placeholder="Where will it be used? (URL, optional)"
              value={usageUrl}
              onChange={(e) => setUsageUrl(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 13, background: "var(--bg-surface-2, #1C1330)", border: "1px solid var(--border-subtle, #2D1F45)", borderRadius: 4, color: "var(--text-primary, #fff)", marginBottom: 10 }}
            />
            <textarea
              placeholder="Any additional details (optional)"
              value={usageDescription}
              onChange={(e) => setUsageDescription(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 60, padding: "10px 12px", fontSize: 13, background: "var(--bg-surface-2, #1C1330)", border: "1px solid var(--border-subtle, #2D1F45)", borderRadius: 4, color: "var(--text-primary, #fff)", marginBottom: 14, resize: "vertical", fontFamily: "inherit" }}
            />
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16, cursor: "pointer" }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted, #A892C6)", lineHeight: 1.6 }}>
                I acknowledge this image is copyright Naveed Anjum / Creative Fusion LLC and my request does not grant any rights unless and until it is approved.
              </span>
            </label>
            {error && <div style={{ fontSize: 12, color: "#e74c3c", marginBottom: 12 }}>{error}</div>}
            <button
              onClick={submit}
              disabled={busy}
              style={{ background: "var(--accent-primary, #8B5CF6)", border: "none", color: "#fff", padding: "11px 24px", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, borderRadius: 2 }}
            >
              {busy ? "Submitting..." : "Submit Request"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
