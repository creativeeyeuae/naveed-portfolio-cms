"use client";
// CMS > Bookings -- extra controls under each booking card: Edit, Start shoot, Pause for an
// emergency (accident, illness, weather, animal / venue issue, equipment...), Resume, Reopen a
// cancelled booking, Undo complete, Delete. Talks to functions/api/admin/bookings/[id]/update.ts.
import { useState } from "react";

const REASONS = ["Emergency", "Accident", "Illness", "Weather", "Animal / venue issue", "Equipment failure", "Client unavailable", "Power / access problem", "Other"];
const pill = (bg: string, fg: string, bd: string) => ({ fontSize: 12.5, fontWeight: 600, borderRadius: 8, padding: "9px 14px", cursor: "pointer", background: bg, color: fg, border: `1px solid ${bd}`, font: "inherit" } as const);
const ghost = pill("rgba(255,255,255,0.06)", "#F5F1FB", "rgba(255,255,255,0.16)");
const inp = { height: 38, borderRadius: 8, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.05)", color: "#F5F1FB", padding: "0 10px", font: "inherit", fontSize: 13 } as const;

export default function BookingExtraActions({ b, token, onDone }: { b: any; token: string; onDone: (msg: string, ok: boolean) => void }) {
  const [mode, setMode] = useState<"" | "edit" | "hold" | "delete">("");
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(true);
  const [f, setF] = useState<any>({});
  const [reason, setReason] = useState("Emergency"); const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");

  const run = async (action: string, extra: any = {}) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/bookings/${b.id}/update`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, notify, ...extra }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      setMode(""); onDone(j.message || "Done", true);
    } catch (e: any) { onDone(e.message || "Failed", false); }
    setBusy(false);
  };

  const closed = ["cancelled", "completed"].includes(b.status);
  const stageBadge = b.stage === "in_progress" ? { t: "▶ Shoot in progress", c: "#4ade80" } : b.stage === "on_hold" ? { t: `⏸ On hold — ${b.stage_reason || "issue"}${b.stage_note ? `: ${b.stage_note}` : ""}`, c: "#fbbf24" } : null;
  const notifyBox = <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#C4B5FD" }}><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />Tell the client</label>;

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {stageBadge && !closed && <div style={{ fontSize: 12.5, fontWeight: 700, color: stageBadge.c }}>{stageBadge.t}</div>}

      {mode === "edit" && (
        <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Edit booking</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Service" defaultValue={b.service_name || ""} onChange={(e) => setF({ ...f, service_name: e.target.value })} />
            <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="Package" defaultValue={b.package_name || ""} onChange={(e) => setF({ ...f, package_name: e.target.value })} />
            <input type="date" style={{ ...inp, width: 150 }} defaultValue={b.booking_date || ""} onChange={(e) => setF({ ...f, booking_date: e.target.value })} />
            <input type="time" style={{ ...inp, width: 120 }} defaultValue={(b.booking_time || "").slice(0, 5)} onChange={(e) => setF({ ...f, booking_time: e.target.value })} />
            <input type="number" style={{ ...inp, width: 130 }} placeholder="Total AED" defaultValue={b.total ?? ""} onChange={(e) => setF({ ...f, total: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{notifyBox}
            <button disabled={busy || !Object.keys(f).length} onClick={() => run("edit", { fields: f })} style={pill("#8B5CF6", "#fff", "#8B5CF6")}>{busy ? "Saving…" : "✓ Save changes"}</button>
            <button onClick={() => { setMode(""); setF({}); }} style={ghost}>Back</button></div>
        </div>
      )}

      {mode === "hold" && (
        <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 10, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Pause this booking — what happened?</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{REASONS.map((r) => <button key={r} onClick={() => setReason(r)} style={reason === r ? pill("rgba(251,191,36,0.2)", "#fbbf24", "#fbbf24") : ghost}>{r}</button>)}</div>
          <input style={inp} placeholder="Short note (optional) — e.g. 'Crew member injured, safe now'" value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{notifyBox}
            <button disabled={busy} onClick={() => run("hold", { reason, note })} style={pill("#f59e0b", "#1a1205", "#f59e0b")}>{busy ? "Saving…" : "⏸ Put on hold"}</button>
            <button onClick={() => setMode("")} style={ghost}>Back</button></div>
          <div style={{ fontSize: 11.5, color: "#A892C6" }}>Nothing is cancelled or charged. When ready, use Resume or Reschedule.</div>
        </div>
      )}

      {mode === "delete" && (
        <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 10, background: "rgba(231,76,60,0.06)", border: "1px solid rgba(231,76,60,0.35)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>Delete booking {b.appointment_ref} permanently?</div>
          <div style={{ fontSize: 12, color: "#E2D9F3" }}>This cannot be undone (a copy is kept in the activity log). Paid bookings can't be deleted. Type <b>DELETE</b> to confirm.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...inp, width: 160 }} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
            <button disabled={busy || typed.trim().toUpperCase() !== "DELETE"} onClick={() => run("delete", { confirm: "DELETE", notify: false })} style={pill("#dc2626", "#fff", "#dc2626")}>{busy ? "Deleting…" : "🗑 Delete"}</button>
            <button onClick={() => { setMode(""); setTyped(""); }} style={ghost}>Back</button></div>
        </div>
      )}

      {!mode && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button disabled={busy} onClick={() => { setF({}); setMode("edit"); }} style={ghost}>✎ Edit</button>
          {b.status === "confirmed" && b.stage !== "in_progress" && b.stage !== "on_hold" && <button disabled={busy} onClick={() => run("start")} style={pill("rgba(74,222,128,0.12)", "#4ade80", "rgba(74,222,128,0.4)")}>▶ Start shoot</button>}
          {!closed && b.stage !== "on_hold" && <button disabled={busy} onClick={() => { setReason("Emergency"); setNote(""); setMode("hold"); }} style={pill("rgba(251,191,36,0.1)", "#fbbf24", "rgba(251,191,36,0.4)")}>⏸ Pause / Emergency</button>}
          {!closed && b.stage === "on_hold" && <button disabled={busy} onClick={() => run("resume")} style={pill("rgba(74,222,128,0.12)", "#4ade80", "rgba(74,222,128,0.4)")}>▶ Resume</button>}
          {b.status === "cancelled" && <button disabled={busy} onClick={() => run("reopen", { notify: false })} style={ghost}>↺ Reopen booking</button>}
          {b.status === "completed" && <button disabled={busy} onClick={() => run("undo_complete", { notify: false })} style={ghost}>↺ Undo complete</button>}
          {["cancelled", "pending", "payment_rejected", "pending_verification"].includes(b.status) && <button disabled={busy} onClick={() => { setTyped(""); setMode("delete"); }} style={{ ...pill("transparent", "#f87171", "rgba(231,76,60,0.5)"), marginLeft: "auto" }}>🗑 Delete</button>}
        </div>
      )}
    </div>
  );
}
