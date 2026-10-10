"use client";
// Client portal -- where the "Client" tab on /login sends a signed-in visitor. Shows their
// own booking history + payment/receipt status (functions/api/client/bookings.ts) and a
// message thread with Naveed (functions/api/client/messages.ts), both scoped server-side
// to the signed-in account -- this page only ever sends the Bearer token, never an id.
//
// Client-side auth check only (this is a static-exported page, no server session) -- same
// pattern as the CMS's own admin gate: render nothing sensitive until a session is
// confirmed, and send anyone without one back to /login rather than showing an empty shell.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { getSession, getUser, getAccessToken, signOut, type User } from "@/lib/authClient";

type Payment = {
  id: string;
  method: "paypal" | "bank_transfer";
  status: string; // pending | under_review | paid | rejected
  receipt_status?: string;
  receipt_path?: string;
  receipt_signed_url?: string;
  rejection_reason?: string;
  total: number;
  currency: string;
};
type Booking = {
  id: string;
  appointment_ref: string;
  service_name: string;
  package_name: string;
  status: string; // pending_verification | pending_payment | confirmed | payment_rejected | cancelled | completed
  booking_date: string;
  booking_time: string;
  total: number;
  price_base: number;
  transaction_fee: number;
  admin_notes?: string;
  payments?: Payment[];
};
type Msg = {
  id: string;
  sender: "client" | "admin";
  sender_name?: string;
  body: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending_verification: "Awaiting payment verification",
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  payment_rejected: "Payment rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};
const STATUS_COLOR: Record<string, string> = {
  pending_verification: "#d4a017",
  pending_payment: "#d4a017",
  confirmed: "#2ecc71",
  payment_rejected: "#e74c3c",
  cancelled: "#666",
  completed: "#3498db",
};

const cardStyle: CSSProperties = {
  background: "var(--bg-surface-1, #140D21)",
  border: "1px solid var(--border-subtle, #2D1F45)",
  borderRadius: 8,
  padding: 20,
};
const btnPrimary: CSSProperties = {
  background: "var(--accent-primary, #8B5CF6)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-subtle, #2D1F45)",
  color: "inherit",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 12.5,
  cursor: "pointer",
};

function ReceiptReupload({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr("Choose a file first."); return; }
    setBusy(true); setErr("");
    try {
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append("appointment_id", appointmentId);
      fd.append("file", file);
      const res = await fetch("/api/client/receipt-upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onDone();
    } catch (e: any) {
      setErr(e.message || "Upload failed.");
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf" style={{ fontSize: 12, color: "inherit" }} />
      <button onClick={submit} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? "Uploading…" : "Re-upload Receipt"}</button>
      {err && <span style={{ color: "#e74c3c", fontSize: 12 }}>{err}</span>}
    </div>
  );
}

function BookingCard({ b, onReceiptChanged }: { b: Booking; onReceiptChanged: () => void }) {
  const payment = (b.payments || [])[0];
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {b.appointment_ref} <span style={{ color: "var(--text-muted, #A892C6)", fontWeight: 400 }}>· {b.service_name} — {b.package_name}</span>
        </div>
        <span style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: STATUS_COLOR[b.status] || "var(--text-muted)", border: `1px solid ${STATUS_COLOR[b.status] || "var(--border-subtle)"}` }}>
          {STATUS_LABEL[b.status] || b.status.replace(/_/g, " ")}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted, #A892C6)", marginBottom: 10 }}>
        {b.booking_date} · {b.booking_time} &nbsp;·&nbsp; {payment?.currency || "AED"} {Number(b.total).toLocaleString()} total
      </div>
      {payment && (
        <div style={{ fontSize: 12.5, marginBottom: 4 }}>
          Payment: {payment.method === "bank_transfer" ? "Bank Transfer" : "PayPal"} ·{" "}
          <span style={{ color: payment.status === "paid" ? "#2ecc71" : payment.status === "rejected" ? "#e74c3c" : "var(--text-muted)" }}>
            {payment.status === "paid" ? "Paid ✓" : payment.status === "rejected" ? "Rejected" : payment.status === "under_review" ? "Receipt under review" : "Awaiting payment"}
          </span>
          {payment.receipt_signed_url && (
            <> · <a href={payment.receipt_signed_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary, #8B5CF6)" }}>View Receipt →</a></>
          )}
        </div>
      )}
      {/* Bank-transfer re-upload widens beyond just "rejected": it also covers the admin's
          "Request New Receipt" action (e.g. an unreadable file) and the first upload, so any
          bank-transfer payment that isn't paid yet can always get a fresh receipt attached. */}
      {payment?.method === "bank_transfer" && payment.status !== "paid" && (
        <div style={{ marginTop: 6 }}>
          {payment.status === "rejected" && payment.rejection_reason && (
            <div style={{ fontSize: 12.5, color: "#e74c3c", marginBottom: 4 }}>Reason: {payment.rejection_reason}</div>
          )}
          <ReceiptReupload appointmentId={b.id} onDone={onReceiptChanged} />
        </div>
      )}
    </div>
  );
}

function MessageThread({ userEmail }: { userEmail?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/client/messages", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true); setErr("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/client/messages", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send message.");
      setText("");
      await load();
    } catch (e: any) {
      setErr(e.message || "Could not send message.");
    }
    setSending(false);
  }

  return (
    <div style={cardStyle}>
      <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {loading ? (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>No messages yet — say hello.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.sender === "client" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <div style={{ background: m.sender === "client" ? "var(--accent-primary, #8B5CF6)" : "rgba(255,255,255,0.06)", color: m.sender === "client" ? "#fff" : "inherit", borderRadius: 10, padding: "8px 12px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {m.body}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: m.sender === "client" ? "right" : "left" }}>
                {m.sender === "client" ? "You" : "Naveed"} · {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {err && <div style={{ color: "#e74c3c", fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Write a message…"
          style={{ flex: 1, minHeight: 42, maxHeight: 120, resize: "vertical", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle, #2D1F45)", borderRadius: 6, color: "inherit", padding: "10px 12px", fontSize: 13, fontFamily: "inherit" }}
        />
        <button onClick={send} disabled={sending || !text.trim()} style={{ ...btnPrimary, opacity: sending || !text.trim() ? 0.6 : 1, alignSelf: "flex-end" }}>{sending ? "…" : "Send"}</button>
      </div>
    </div>
  );
}

function ProfileCard() {
  const [p, setP] = useState<any>(null);
  const [wa, setWa] = useState(""); const [bio, setBio] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState(""); const [pwMsg, setPwMsg] = useState("");
  const call = async (body?: any) => {
    const token = await getAccessToken();
    const r = await fetch("/api/client/profile", body ? { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) } : { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json(); if (!r.ok) throw new Error(j.error || "Failed"); setP(j); setWa(j.whatsapp || ""); setBio(j.bio || ""); return j;
  };
  useEffect(() => { call().catch(() => {}); }, []);
  const pickAvatar = (f?: File) => {
    if (!f) return; const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = async () => {
      const s = 256, c = document.createElement("canvas"); c.width = s; c.height = s; const ctx = c.getContext("2d")!;
      const m = Math.min(img.width, img.height); ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(url); setBusy(true); setMsg("");
      try { await call({ avatar: c.toDataURL("image/jpeg", 0.82) }); setMsg("✓ Photo updated"); } catch (e: any) { setMsg(e.message); } setBusy(false);
    };
    img.src = url;
  };
  const inp: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "inherit", fontSize: 14 };
  const ro: CSSProperties = { ...inp, opacity: 0.6, cursor: "not-allowed" };
  const lbl: CSSProperties = { fontSize: 12, color: "var(--text-muted,#A892C6)", display: "block", marginBottom: 6 };
  if (!p) return <div style={cardStyle}><span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading profile…</span></div>;
  return (
    <div style={{ ...cardStyle, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, flexShrink: 0 }}>
          {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (p.name || p.email || "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name || "Client"}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted,#A892C6)", marginBottom: 8 }}>{p.email}</div>
          <label style={{ ...btnGhost, display: "inline-block", cursor: "pointer" }}>{busy ? "Saving…" : "Change photo"}<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => pickAvatar(e.target.files?.[0])} /></label>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <div><label style={lbl}>Name (contact us to change)</label><input style={ro} value={p.name} readOnly /></div>
        <div><label style={lbl}>Email (cannot be changed)</label><input style={ro} value={p.email} readOnly /></div>
        <div><label style={lbl}>WhatsApp number</label><input style={inp} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="+971 5X XXX XXXX" /></div>
      </div>
      <div><label style={lbl}>About you / your company</label><textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about you or your business" /></div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button disabled={busy} onClick={async () => { setBusy(true); setMsg(""); try { await call({ whatsapp: wa, bio }); setMsg("✓ Profile saved"); } catch (e: any) { setMsg(e.message); } setBusy(false); }} style={btnPrimary}>{busy ? "Saving…" : "Save profile"}</button>
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{msg}</span>}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Change password</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <input type="password" style={inp} placeholder="New password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" />
          <input type="password" style={inp} placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
          <button disabled={pw1.length < 8 || pw1 !== pw2} onClick={async () => { setPwMsg(""); const { updatePassword } = await import("@/lib/authClient"); const { error } = await updatePassword(pw1); setPwMsg(error ? error.message : "✓ Password changed"); if (!error) { setPw1(""); setPw2(""); } }} style={btnGhost}>Update password</button>
          {pwMsg && <span style={{ fontSize: 12.5, color: pwMsg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{pwMsg}</span>}
        </div>
      </div>
    </div>
  );
}


async function api(path: string, body?: any) {
  const token = await getAccessToken();
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) } : { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong.");
  return j;
}
const field: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "inherit", fontSize: 14 };
function feeFor(date: string, time: string) {
  const h = (new Date(`${date}T${(time || "00:00:00").slice(0, 8)}+04:00`).getTime() - Date.now()) / 3600e3;
  return h > 72 ? 0 : h >= 24 ? 50 : 100;
}

function BookingActions({ b, onDone }: { b: Booking; onDone: () => void }) {
  const [mode, setMode] = useState<"" | "cancel" | "reschedule">("");
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  if (["cancelled", "completed"].includes(b.status)) return null;
  const fee = feeFor((b as any).booking_date, (b as any).booking_time);
  const submit = async () => {
    setBusy(true); setMsg("");
    try { await api("/api/client/requests", { appointment_id: b.id, kind: mode, new_date: date, new_time: time, reason }); setMsg("✓ Request sent. Naveed will confirm shortly on WhatsApp and email."); setMode(""); onDone(); }
    catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ marginTop: -6, marginBottom: 8, paddingLeft: 4 }}>
      {!mode && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setMode("reschedule")} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12 }}>📅 Request reschedule</button>
        <button onClick={() => setMode("cancel")} style={{ ...btnGhost, padding: "7px 12px", fontSize: 12, color: "#f87171", borderColor: "rgba(248,113,113,0.5)" }}>✕ Request cancellation</button>
      </div>}
      {mode && <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{mode === "cancel" ? "Request cancellation" : "Request a new date"}</div>
        {mode === "cancel" ? (
          <div style={{ fontSize: 13, color: fee === 0 ? "#4ade80" : fee === 50 ? "#fbbf24" : "#f87171" }}>
            {fee === 0 ? "Free cancellation (more than 72 hours before)." : fee === 50 ? "50% of the total is charged (within 72–24 hours)." : "No refund (less than 24 hours before)."} <a href="/terms#cancellation" target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd" }}>Terms</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="date" style={field} value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" style={field} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        )}
        <textarea style={{ ...field, minHeight: 60 }} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={busy || (mode === "reschedule" && (!date || !time))} onClick={submit} style={btnPrimary}>{busy ? "Sending…" : "Send request"}</button>
          <button onClick={() => setMode("")} style={btnGhost}>Back</button>
        </div>
      </div>}
      {msg && <div style={{ fontSize: 12.5, marginTop: 6, color: msg.startsWith("✓") ? "#4ade80" : "#f87171" }}>{msg}</div>}
    </div>
  );
}

function RequestsPanel() {
  const [list, setList] = useState<any[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/api/client/requests").then((j) => setList(j.requests)).catch((e) => { setErr(e.message); setList([]); }); }, []);
  const col: Record<string, string> = { pending: "#fbbf24", approved: "#4ade80", rejected: "#f87171", withdrawn: "#94a3b8" };
  if (!list) return <div style={cardStyle}>Loading…</div>;
  if (!list.length) return <div style={cardStyle}><span style={{ fontSize: 13, color: "var(--text-muted,#A892C6)" }}>{err || "No requests yet. You can request a reschedule or cancellation from My Bookings."}</span></div>;
  return <div style={{ display: "grid", gap: 10 }}>{list.map((r) => (
    <div key={r.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 700 }}>{r.kind === "cancel" ? "Cancellation" : "Reschedule"} · {r.appointments?.appointment_ref}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted,#A892C6)" }}>{r.appointments?.service_name} · {r.kind === "reschedule" ? `to ${r.new_date} ${String(r.new_time || "").slice(0, 5)}` : `fee ${Number(r.fee_percent)}%`} · {new Date(r.created_at).toLocaleDateString("en-GB")}</div>
        {r.admin_note && <div style={{ fontSize: 12.5, marginTop: 4 }}>Note: {r.admin_note}</div>}
      </div>
      <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 700, color: col[r.status], border: `1px solid ${col[r.status]}`, borderRadius: 20, padding: "3px 10px", textTransform: "uppercase" }}>{r.status}</span>
    </div>))}</div>;
}

function WalletPanel() {
  const [w, setW] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/api/client/wallet").then(setW).catch((e) => { setErr(e.message); setW({ balance: 0, transactions: [] }); }); }, []);
  if (!w) return <div style={cardStyle}>Loading…</div>;
  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ ...cardStyle, background: "linear-gradient(135deg,rgba(139,92,246,0.35),rgba(139,92,246,0.08))" }}>
      <div style={{ fontSize: 12.5, color: "var(--text-muted,#A892C6)" }}>Wallet balance</div>
      <div style={{ fontSize: 34, fontWeight: 700 }}>AED {Number(w.balance).toLocaleString("en-US")}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted,#A892C6)", marginTop: 4 }}>Credit from refunds, gifts and offers. Ask Naveed to use it on your next booking.</div>
    </div>
    {err && <div style={{ color: "#f87171", fontSize: 12.5 }}>{err}</div>}
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>History</div>
      {!w.transactions.length ? <div style={{ fontSize: 13, color: "var(--text-muted,#A892C6)" }}>No transactions yet.</div> :
        w.transactions.map((t: any) => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 13 }}>
          <span>{t.note || t.kind}<br /><span style={{ fontSize: 11.5, color: "var(--text-muted,#A892C6)" }}>{new Date(t.created_at).toLocaleDateString("en-GB")}</span></span>
          <b style={{ color: Number(t.amount) > 0 ? "#4ade80" : "#f87171" }}>{Number(t.amount) > 0 ? "+" : ""}{Number(t.amount).toLocaleString("en-US")} AED</b>
        </div>)}
    </div>
  </div>;
}

export default function ClientPortalPage() {
  const [tab, setTab] = useState<"bookings" | "requests" | "wallet" | "messages" | "profile">("bookings");
  const [checked, setChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsErr, setBookingsErr] = useState("");

  async function loadBookings() {
    setBookingsLoading(true); setBookingsErr("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/client/bookings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load your bookings.");
      setBookings(data.bookings || []);
    } catch (e: any) {
      setBookingsErr(e.message || "Could not load your bookings.");
    }
    setBookingsLoading(false);
  }

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
        loadBookings();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }} />;
  }

  const MENU: [typeof tab, string, string][] = [["bookings", "📅", "My Bookings"], ["requests", "📝", "Requests"], ["wallet", "💳", "Wallet"], ["messages", "💬", "Messages"], ["profile", "👤", "My Profile"]];
  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <style>{`.cp-wrap{display:grid;grid-template-columns:240px 1fr;gap:28px;max-width:1180px;margin:0 auto;padding:40px 24px 100px}
.cp-side{position:sticky;top:24px;align-self:start;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:14px}
.cp-item{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:11px 12px;border-radius:9px;border:none;background:transparent;color:inherit;font-size:14px;cursor:pointer;margin-bottom:4px}
.cp-item:hover{background:rgba(255,255,255,0.06)}.cp-item.on{background:#8B5CF6;color:#fff;font-weight:700}
@media(max-width:820px){.cp-wrap{grid-template-columns:1fr;padding:20px 14px 80px}.cp-side{position:static;display:flex;overflow-x:auto;gap:6px;padding:8px}.cp-item{white-space:nowrap;margin:0;width:auto}.cp-hide{display:none}}`}</style>
      <div className="cp-wrap">
        <aside className="cp-side">
          <div className="cp-hide" style={{ padding: "6px 10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Client Area</div>
            <div style={{ fontSize: 12, color: "var(--text-muted,#A892C6)", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          </div>
          {MENU.map(([k, i, l]) => <button key={k} className={`cp-item${tab === k ? " on" : ""}`} onClick={() => setTab(k)}><span>{i}</span>{l}</button>)}
          <a href="/booking" className="cp-item" style={{ textDecoration: "none" }}><span>➕</span>New Booking</a>
          <button className="cp-item" onClick={async () => { await signOut(); window.location.href = "/login"; }}><span>↩</span>Sign out</button>
        </aside>
        <section>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 18px" }}>{MENU.find((m) => m[0] === tab)?.[2]}</h1>
          {tab === "bookings" && (<>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}><button onClick={loadBookings} style={{ ...btnGhost, padding: "6px 12px", fontSize: 11 }}>↻ Refresh</button></div>
            {bookingsErr && <div style={{ color: "#e74c3c", fontSize: 12.5, marginBottom: 14 }}>{bookingsErr}</div>}
            {bookingsLoading ? <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading…</div> : bookings.length === 0 ? (
              <div style={cardStyle}><p style={{ fontSize: 13, color: "var(--text-muted, #A892C6)", margin: 0 }}>No bookings yet. <Link href="/booking" style={{ color: "var(--accent-primary, #8B5CF6)" }}>Book a session</Link> and it'll show up here.</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bookings.map((b) => (<div key={b.id}><BookingCard b={b} onReceiptChanged={loadBookings} /><BookingActions b={b} onDone={loadBookings} /></div>))}
              </div>
            )}
          </>)}
          {tab === "requests" && <RequestsPanel />}
          {tab === "wallet" && <WalletPanel />}
          {tab === "messages" && <MessageThread userEmail={user?.email} />}
          {tab === "profile" && <ProfileCard />}
        </section>
      </div>
    </main>
  );
}
