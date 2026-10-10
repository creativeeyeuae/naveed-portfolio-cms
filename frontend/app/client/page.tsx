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

const cardStyle: CSSProperties = { background: "#1B1230", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 };
const btnPrimary: CSSProperties = {
  background: "var(--accent-primary, #8B5CF6)",
  color: "#fff",
  border: "none",
  borderRadius: 9,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "#F5F1FB",
  borderRadius: 9,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
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

function BookingCard({ b, onReceiptChanged, onMessage }: { b: Booking; onReceiptChanged: () => void; onMessage?: () => void }) {
  const payment = (b.payments || [])[0];
  const col = STATUS_COLOR[b.status] || "#A892C6";
  const tile: CSSProperties = { background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px" };
  const isCash = (payment as any)?.provider === "cash";
  const payTxt = !payment ? "—" : payment.status === "paid" ? `Paid · ${payment.method === "paypal" ? "Card / PayPal" : isCash ? "Cash" : "Bank transfer"}` : isCash ? "Cash before event" : payment.status === "under_review" ? "Receipt under review" : payment.status === "rejected" ? "Rejected" : "Awaiting payment";
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{b.service_name}</div>
          <div style={{ fontSize: 12.5, color: "#A892C6", marginTop: 2 }}>Ref {b.appointment_ref} · {b.package_name}</div>
        </div>
        <span style={{ alignSelf: "flex-start", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, borderRadius: 20, padding: "4px 10px", color: col, border: `1px solid ${col}`, textTransform: "uppercase" }}>{STATUS_LABEL[b.status] || b.status.replace(/_/g, " ")}</span>
      </div>
      <div className="cp-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={tile}><div style={{ fontSize: 11.5, color: "#A892C6" }}>Date &amp; time</div><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{new Date(b.booking_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {String(b.booking_time || "").slice(0, 5)}</div></div>
        <div style={tile}><div style={{ fontSize: 11.5, color: "#A892C6" }}>Total</div><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{payment?.currency || "AED"} {Number(b.total).toLocaleString("en-US")}</div></div>
        <div style={tile}><div style={{ fontSize: 11.5, color: "#A892C6" }}>Payment</div><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3, color: payment?.status === "paid" ? "#4ADE80" : payment?.status === "rejected" ? "#F87171" : "#F5F1FB" }}>{payTxt}</div></div>
      </div>
      {payment?.receipt_signed_url && <a href={payment.receipt_signed_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "#C4B5FD" }}>View receipt →</a>}
      {payment?.method === "bank_transfer" && !isCash && payment.status !== "paid" && (
        <div>
          {payment.status === "rejected" && payment.rejection_reason && <div style={{ fontSize: 12.5, color: "#F87171", marginBottom: 4 }}>Reason: {payment.rejection_reason}</div>}
          <ReceiptReupload appointmentId={b.id} onDone={onReceiptChanged} />
        </div>
      )}
      {payment && payment.status !== "paid" && !["cancelled", "completed"].includes(b.status) && <WalletPayBtn id={b.id} total={Number(b.total)} onDone={onReceiptChanged} />}
      <BookingActions b={b} onDone={onReceiptChanged} onMessage={onMessage} />
    </div>
  );
}

function WalletPayBtn({ id, total, onDone }: { id: string; total: number; onDone: () => void }) {
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  return <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <button disabled={busy} onClick={async () => { setBusy(true); setMsg(""); try { await api("/api/client/pay-wallet", { appointment_id: id }); setMsg("✓ Paid from wallet — booking confirmed."); onDone(); } catch (e: any) { setMsg(e.message); } setBusy(false); }} style={{ ...btnPrimary, background: "#16A34A" }}>{busy ? "Paying…" : `Pay AED ${total.toLocaleString()} from wallet`}</button>
    {msg && <span style={{ fontSize: 12.5, color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>{msg}</span>}
  </div>;
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
          <div style={{ fontSize: 12.5, color: "#A892C6" }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#A892C6", fontStyle: "italic" }}>No messages yet — say hello.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.sender === "client" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <div style={{ background: m.sender === "client" ? "var(--accent-primary, #8B5CF6)" : "rgba(255,255,255,0.06)", color: m.sender === "client" ? "#fff" : "inherit", borderRadius: 10, padding: "8px 12px", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {m.body}
              </div>
              <div style={{ fontSize: 10, color: "#A892C6", marginTop: 3, textAlign: m.sender === "client" ? "right" : "left" }}>
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
  const lbl: CSSProperties = { fontSize: 12, color: "#A892C6", display: "block", marginBottom: 6 };
  if (!p) return <div style={cardStyle}><span style={{ fontSize: 12.5, color: "#A892C6" }}>Loading profile…</span></div>;
  return (
    <div style={{ ...cardStyle, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, flexShrink: 0 }}>
          {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (p.name || p.email || "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name || "Client"}</div>
          <div style={{ fontSize: 13, color: "#A892C6", marginBottom: 8 }}>{p.email}</div>
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

function BookingActions({ b, onDone, onMessage }: { b: Booking; onDone: () => void; onMessage?: () => void }) {
  const [mode, setMode] = useState<"" | "cancel" | "reschedule">("");
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const closed = ["cancelled", "completed"].includes(b.status);
  const fee = feeFor((b as any).booking_date, (b as any).booking_time);
  const submit = async () => {
    setBusy(true); setMsg("");
    try { await api("/api/client/requests", { appointment_id: b.id, kind: mode, new_date: date, new_time: time, reason }); setMsg("✓ Request sent. Naveed will confirm shortly on WhatsApp and email."); setMode(""); onDone(); }
    catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  return (
    <div>
      {!mode && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!closed && <button onClick={() => setMode("reschedule")} style={btnGhost}>Request reschedule</button>}
        {!closed && <button onClick={() => setMode("cancel")} style={{ ...btnGhost, color: "#FCA5A5", borderColor: "rgba(248,113,113,0.55)" }}>Request cancellation</button>}
        {onMessage && <button onClick={onMessage} style={{ ...btnGhost, border: "none", background: "rgba(139,92,246,0.18)", color: "#E2D9F3" }}>Message Naveed</button>}
      </div>}
      {mode && <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
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
  if (!list.length) return <div style={cardStyle}><span style={{ fontSize: 13, color: "#A892C6" }}>{err || "No requests yet. You can request a reschedule or cancellation from My Bookings."}</span></div>;
  return <div style={{ display: "grid", gap: 10 }}>{list.map((r) => (
    <div key={r.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 700 }}>{r.kind === "cancel" ? "Cancellation" : "Reschedule"} · {r.appointments?.appointment_ref}</div>
        <div style={{ fontSize: 12.5, color: "#A892C6" }}>{r.appointments?.service_name} · {r.kind === "reschedule" ? `to ${r.new_date} ${String(r.new_time || "").slice(0, 5)}` : `fee ${Number(r.fee_percent)}%`} · {new Date(r.created_at).toLocaleDateString("en-GB")}</div>
        {r.admin_note && <div style={{ fontSize: 12.5, marginTop: 4 }}>Note: {r.admin_note}</div>}
      </div>
      <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 700, color: col[r.status], border: `1px solid ${col[r.status]}`, borderRadius: 20, padding: "3px 10px", textTransform: "uppercase" }}>{r.status}</span>
    </div>))}</div>;
}

function TopUp({ onDone }: { onDone: () => void }) {
  const [amt, setAmt] = useState(500); const [cfg, setCfg] = useState<any>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement | null>(null); const amtRef = useRef(amt); amtRef.current = amt;
  useEffect(() => { fetch("/api/payments/paypal/config").then((r) => r.json()).then(setCfg).catch(() => setCfg({ enabled: false })); }, []);
  useEffect(() => {
    if (!cfg?.enabled || !cfg.clientId) return; let dead = false;
    const render = () => {
      const pp = (window as any).paypal; if (!pp || !box.current || dead) return; box.current.innerHTML = "";
      for (const src of [pp.FUNDING.CARD, pp.FUNDING.PAYPAL]) {
        const b = pp.Buttons({ fundingSource: src, style: { layout: "vertical", shape: "rect", label: "pay", height: 45 },
          createOrder: async () => { setMsg(""); const j = await api("/api/client/wallet-topup", { action: "create", amount_aed: amtRef.current }).catch((e) => { setMsg(e.message); throw e; }); return j.id; },
          onApprove: async (d: any) => { setBusy(true); try { const j = await api("/api/client/wallet-topup", { action: "capture", order_id: d.orderID }); setMsg(j.pending ? j.message : `✓ AED ${amtRef.current.toLocaleString()} added. New balance AED ${Number(j.balance).toLocaleString()}`); onDone(); } catch (e: any) { setMsg(e.message); } setBusy(false); },
          onCancel: () => setMsg("Top-up cancelled."), onError: () => setMsg("PayPal error — please try again.") });
        if (!b.isEligible || b.isEligible()) b.render(box.current).catch(() => {});
      }
    };
    if ((window as any).paypal) render(); else {
      let sc = document.getElementById("paypal-sdk") as HTMLScriptElement | null;
      if (!sc) { sc = document.createElement("script"); sc.id = "paypal-sdk"; sc.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.clientId)}&currency=USD&intent=capture&components=buttons&enable-funding=card&disable-funding=paylater,venmo`; sc.async = true; document.body.appendChild(sc); }
      sc.addEventListener("load", render);
    }
    return () => { dead = true; };
  }, [cfg]);
  if (cfg && !cfg.enabled) return null;
  const usd = (Math.round((amt / (cfg?.aedPerUsd || 3.6725)) * 100) / 100).toFixed(2);
  return <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
    <div><div style={{ fontSize: 17, fontWeight: 700 }}>Add credit</div><div style={{ fontSize: 13, color: "#A892C6", marginTop: 4 }}>Top up in advance and pay future bookings instantly from your wallet.</div></div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[250, 500, 1000, 2000, 5000].map((v) => <button key={v} onClick={() => setAmt(v)} style={{ borderRadius: 20, padding: "8px 14px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", border: amt === v ? "none" : "1px solid rgba(255,255,255,0.16)", background: amt === v ? "#8B5CF6" : "transparent", color: "#fff" }}>AED {v.toLocaleString()}</button>)}</div>
    <label style={{ display: "grid", gap: 6, fontSize: 12.5, color: "#C4B5FD", fontWeight: 600 }}>Or enter amount (AED 50 – 20,000)<input type="number" min={50} max={20000} value={amt} onChange={(e) => setAmt(Math.max(0, Math.round(Number(e.target.value) || 0)))} style={{ ...field, maxWidth: 220 }} /></label>
    <div style={{ fontSize: 12.5, color: "#A892C6" }}>Charged as USD {usd} (1 USD = 3.6725 AED).{cfg?.env !== "live" && <span style={{ color: "#FBBF24" }}> Test mode — no real money.</span>}</div>
    {amt >= 50 && amt <= 20000 ? <div ref={box} style={{ background: "#fff", borderRadius: 10, padding: 12, maxWidth: 420, opacity: busy ? 0.5 : 1, pointerEvents: busy ? "none" : "auto" }} /> : <div style={{ fontSize: 12.5, color: "#F87171" }}>Choose an amount between AED 50 and 20,000.</div>}
    {msg && <div style={{ fontSize: 13, color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>{msg}</div>}
  </div>;
}

function WalletPanel() {
  const [w, setW] = useState<any>(null); const [err, setErr] = useState("");
  const load = () => api("/api/client/wallet").then(setW).catch((e) => { setErr(e.message); setW({ balance: 0, transactions: [] }); });
  useEffect(() => { load(); }, []);
  if (!w) return <div style={cardStyle}>Loading…</div>;
  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ ...cardStyle, background: "linear-gradient(135deg,rgba(139,92,246,0.35),rgba(139,92,246,0.08))" }}>
      <div style={{ fontSize: 12.5, color: "#A892C6" }}>Wallet balance</div>
      <div style={{ fontSize: 34, fontWeight: 700 }}>AED {Number(w.balance).toLocaleString("en-US")}</div>
      <div style={{ fontSize: 12.5, color: "#A892C6", marginTop: 4 }}>Use it to pay any booking instantly — at checkout or from My Bookings.</div>
    </div>
    <TopUp onDone={load} />
    {err && <div style={{ color: "#f87171", fontSize: 12.5 }}>{err}</div>}
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>History</div>
      {!w.transactions.length ? <div style={{ fontSize: 13, color: "#A892C6" }}>No transactions yet.</div> :
        w.transactions.map((t: any) => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 13 }}>
          <span>{t.note || t.kind}<br /><span style={{ fontSize: 11.5, color: "#A892C6" }}>{new Date(t.created_at).toLocaleDateString("en-GB")}</span></span>
          <b style={{ color: Number(t.amount) > 0 ? "#4ade80" : "#f87171" }}>{Number(t.amount) > 0 ? "+" : ""}{Number(t.amount).toLocaleString("en-US")} AED</b>
        </div>)}
    </div>
  </div>;
}

function InquiryPanel({ bookings, onSent }: { bookings: Booking[]; onSent: () => void }) {
  const [topic, setTopic] = useState("New project / quote"); const [ref, setRef] = useState(""); const [date, setDate] = useState("");
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const lbl: CSSProperties = { display: "grid", gap: 6, fontSize: 12.5, color: "#C4B5FD", fontWeight: 600 };
  const send = async () => {
    setBusy(true); setMsg("");
    const body = `📩 Inquiry: ${topic}${ref ? ` · ${ref}` : ""}${date ? ` · preferred date ${date}` : ""}\n\n${text.trim()}`;
    try { await api("/api/client/messages", { body }); setText(""); setMsg("✓ Sent. Naveed will reply here and on WhatsApp."); setTimeout(onSent, 900); } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  return <div style={{ ...cardStyle, display: "grid", gap: 14, maxWidth: 760 }}>
    <div><div style={{ fontSize: 17, fontWeight: 700 }}>Send an inquiry</div><div style={{ fontSize: 13, color: "#A892C6", marginTop: 4 }}>Ask for a quote, a custom package or anything about an existing booking.</div></div>
    <div className="cp-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
      <label style={lbl}>Topic<select value={topic} onChange={(e) => setTopic(e.target.value)} style={{ ...field, background: "#221640" }}>{["New project / quote", "Custom package", "About my booking", "Files / delivery", "Other"].map((t) => <option key={t}>{t}</option>)}</select></label>
      <label style={lbl}>Related booking<select value={ref} onChange={(e) => setRef(e.target.value)} style={{ ...field, background: "#221640" }}><option value="">None</option>{bookings.map((b) => <option key={b.id} value={b.appointment_ref}>{b.appointment_ref} · {b.service_name}</option>)}</select></label>
      <label style={lbl}>Preferred date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} /></label>
    </div>
    <label style={lbl}>Message<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell us what you need — location, duration, number of people, deliverables…" style={{ ...field, minHeight: 140, resize: "vertical", lineHeight: 1.6 }} /></label>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button disabled={busy || text.trim().length < 5} onClick={send} style={{ ...btnPrimary, padding: "12px 20px", opacity: busy || text.trim().length < 5 ? 0.6 : 1 }}>{busy ? "Sending…" : "Send inquiry"}</button>
      {msg && <span style={{ fontSize: 13, color: msg.startsWith("✓") ? "#4ADE80" : "#F87171" }}>{msg}</span>}
    </div>
  </div>;
}

export default function ClientPortalPage() {
  const [tab, setTab] = useState<"dashboard" | "bookings" | "requests" | "wallet" | "files" | "messages" | "inquiry" | "profile">("dashboard");
  const [bFilter, setBFilter] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [feed, setFeed] = useState<any>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [promoHidden, setPromoHidden] = useState(false);
  const [q, setQ] = useState("");
  const [wallet, setWallet] = useState<number | null>(null);
  const [walletTx, setWalletTx] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  async function loadFeed() { try { setFeed(await api("/api/client/feed")); } catch { setFeed({ banner: null, notifications: [], unread: 0, deliveries: [] }); } }
  useEffect(() => { (async () => { const ss = await getSession(); if (!ss) return; loadFeed(); api("/api/client/wallet").then((j) => { setWallet(j.balance); setWalletTx(j.transactions || []); }).catch(() => setWallet(0)); api("/api/client/requests").then((j) => setReqs(j.requests || [])).catch(() => {}); })(); }, []);
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
    return <main style={{ background: "#120B20", color: "#F5F1FB", minHeight: "100vh", fontFamily: "Manrope, system-ui, -apple-system, sans-serif" }} />;
  }

  const MENU: [typeof tab, string, string][] = [["dashboard", "M3 12l9-9 9 9M5 10v10h14V10", "Dashboard"], ["bookings", "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "My Bookings"], ["requests", "M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11", "Requests"], ["wallet", "M3 7h18v12H3zM16 13h2M3 7l3-4h12l3 4", "Wallet"], ["files", "M4 16l4-4 4 4 4-6 4 6M4 4h16v16H4z", "My Files"], ["messages", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "Messages"], ["inquiry", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01", "New Inquiry"], ["profile", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "My Profile"]];
  const MOBILE: (typeof tab)[] = ["dashboard", "bookings", "files", "wallet", "profile"];
  const Icon = ({ d, size = 18 }: { d: string; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
  const ql = q.trim().toLowerCase();
  const match = (...xs: any[]) => !ql || xs.join(" ").toLowerCase().includes(ql);
  const shownBookings = bookings.filter((b: any) => match(b.appointment_ref, b.service_name, b.package_name, b.booking_date, b.status));
  const deliveries = (feed?.deliveries || []).filter((d: any) => match(d.appointments?.appointment_ref, d.appointments?.service_name));
  const upcoming = bookings.filter((b: any) => ["pending_verification", "confirmed"].includes(b.status));
  const banner = feed?.banner;
  const go = (t: typeof tab) => { setTab(t); setBellOpen(false); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); };
  const card: CSSProperties = { background: "#1B1230", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 };
  const isPast = (b: any) => b.status === "completed" || (b.status !== "cancelled" && new Date(b.booking_date + "T23:59:59") < new Date());
  const filtered = shownBookings.filter((b: any) => bFilter === "cancelled" ? b.status === "cancelled" : bFilter === "past" ? isPast(b) : b.status !== "cancelled" && !isPast(b));
  const chip = (on: boolean): CSSProperties => ({ borderRadius: 20, padding: "8px 14px", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: on ? "none" : "1px solid rgba(255,255,255,0.14)", background: on ? "#8B5CF6" : "transparent", color: on ? "#fff" : "#E2D9F3" });
  const initial = (user?.user_metadata?.full_name || user?.email || "?").slice(0, 1).toUpperCase();
  const searchBox = (light: boolean) => (
    <label style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 10, background: light ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.05)", border: light ? "none" : "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "0 14px", height: 48 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={light ? "#5B4B7A" : "#A892C6"} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <span style={{ position: "absolute", left: -9999 }}>Search</span>
      <input value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value && tab === "dashboard") setTab("bookings"); }} placeholder="Search bookings, files, references…" style={{ border: "none", outline: "none", background: "transparent", color: light ? "#1B1230" : "inherit", font: "inherit", fontSize: 15, flex: 1, minWidth: 0 }} />
    </label>
  );
  return (
    <main style={{ background: "#120B20", color: "#F5F1FB", minHeight: "100vh", fontFamily: "Manrope, system-ui, -apple-system, sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" />
      <style>{`.cp-wrap{display:grid;grid-template-columns:250px 1fr;gap:28px;max-width:1240px;margin:0 auto;padding:32px 24px 100px}
.cp-side{position:sticky;top:24px;align-self:start;background:#1B1230;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:18px}
.cp-label{font-size:11px;font-weight:700;letter-spacing:1.5px;color:#8A7AA8;padding:8px 10px 4px}
.cp-mob{display:none}
main input,main textarea,main select,main button{font-family:inherit}
.cp-item{display:flex;gap:12px;align-items:center;width:100%;text-align:left;padding:12px;border-radius:10px;border:none;background:transparent;color:#E2D9F3;font-weight:500;font:inherit;font-size:14px;cursor:pointer;margin-bottom:4px;text-decoration:none}
.cp-item:hover{background:rgba(255,255,255,0.06)}.cp-item.on{background:#8B5CF6;color:#fff;font-weight:700}
.cp-tabs{display:none}
@media(max-width:860px){.cp-wrap{grid-template-columns:1fr;padding:16px 14px 110px}.cp-side{display:none}.cp-mob{display:flex}.cp-3{grid-template-columns:1fr!important}.cp-2{grid-template-columns:1fr!important}
.cp-tabs{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;z-index:30;background:#1B1230;border-top:1px solid rgba(255,255,255,0.1);padding:6px 4px calc(10px + env(safe-area-inset-bottom))}
.cp-tab{display:flex;flex-direction:column;align-items:center;gap:3px;min-height:52px;justify-content:center;border:none;background:transparent;color:#8A7AA8;font:inherit;font-size:11px;cursor:pointer}.cp-tab.on{color:#C4B5FD;font-weight:700}}`}</style>
      <div className="cp-wrap">
        <aside className="cp-side">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff", flexShrink: 0 }}>{initial}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.user_metadata?.full_name || "My account"}</div>
              <div style={{ fontSize: 12, color: "#A892C6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
          </div>
          <div className="cp-label">CLIENT AREA</div>
          {MENU.map(([k, d, l]) => <button key={k} className={`cp-item${tab === k ? " on" : ""}`} onClick={() => go(k)}><Icon d={d} /><span style={{ flex: 1 }}>{l}</span>{k === "files" && feed?.deliveries?.length ? <span style={{ fontSize: 11, fontWeight: 700, background: "#4ADE80", color: "#14281C", borderRadius: 20, padding: "1px 8px" }}>{feed.deliveries.length}</span> : null}</button>)}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
          <a href="/?page=booking" className="cp-item" style={{ background: "#8B5CF6", color: "#fff", fontWeight: 700, justifyContent: "center" }}>+ New Booking</a>
          <button className="cp-item" onClick={() => go("inquiry")} style={{ justifyContent: "center", border: "1px solid rgba(255,255,255,0.16)", marginTop: 6 }}>Send an inquiry</button>
          <button className="cp-item" style={{ color: "#A892C6" }} onClick={async () => { await signOut(); window.location.href = "/login"; }}><Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />Sign out</button>
        </aside>
        <section style={{ minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, position: "relative" }}>
            <div><div style={{ fontSize: 13, color: "#A892C6" }}>Welcome back</div><h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5, margin: "4px 0 0" }}>{MENU.find((m) => m[0] === tab)?.[2]}</h1></div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/?page=booking" className="cp-mob" style={{ alignItems: "center", height: 46, padding: "0 14px", borderRadius: 12, background: "#8B5CF6", color: "#fff", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>+ Book</a>
              <button aria-label="Notifications" onClick={async () => { setBellOpen(!bellOpen); if (!bellOpen && feed?.unread) { await api("/api/client/feed", { action: "read_all" }).catch(() => {}); setFeed({ ...feed, unread: 0, notifications: feed.notifications.map((n: any) => ({ ...n, read: true, wasUnread: !n.read })) }); } }} style={{ position: "relative", width: 46, height: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
                {feed?.unread ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, background: "#F43F5E", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{feed.unread}</span> : null}
              </button>
            </div>
            {bellOpen && <div style={{ position: "absolute", top: 54, right: 0, width: "min(360px, 92vw)", maxHeight: 420, overflowY: "auto", background: "#221640", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 8, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", zIndex: 40 }}>
              <div style={{ padding: "8px 10px", fontWeight: 700 }}>Notifications</div>
              {!feed?.notifications?.length ? <div style={{ padding: 10, fontSize: 13, color: "#A892C6" }}>No notifications yet.</div> :
                feed.notifications.map((n: any) => <a key={n.id} href={n.link || "#"} target={n.link && /^https/.test(n.link) ? "_blank" : undefined} rel="noopener noreferrer" style={{ display: "flex", gap: 10, padding: 10, borderRadius: 10, textDecoration: "none", color: "inherit", background: n.wasUnread ? "rgba(139,92,246,0.14)" : "transparent" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.wasUnread ? "#8B5CF6" : "transparent", marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{n.title}{n.body ? <><br /><span style={{ color: "#A892C6" }}>{n.body}</span></> : null}<br /><span style={{ fontSize: 11.5, color: "#A892C6" }}>{new Date(n.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
                </a>)}
            </div>}
          </div>

          {tab === "dashboard" && (<div style={{ display: "grid", gap: 16 }}>
            {banner && !promoHidden ? (
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, minHeight: 280, backgroundColor: "#2A1B47", backgroundImage: banner.image_url ? `url(${banner.image_url})` : "none", backgroundSize: "cover", backgroundPosition: "center" }}>
                <div style={{ position: "absolute", inset: 0, background: banner.overlay_color || "#1B0F33", opacity: (banner.overlay_opacity ?? 55) / 100 }} />
                <button aria-label="Dismiss offer" onClick={() => setPromoHidden(true)} style={{ position: "absolute", top: 14, right: 14, zIndex: 2, width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.45)", background: "rgba(0,0,0,0.25)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
                <div style={{ position: "relative", zIndex: 1, padding: "clamp(22px,4vw,38px)", display: "grid", gap: 16, maxWidth: 760 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "rgba(255,255,255,0.85)" }}>{banner.ends_at ? `OFFER · ENDS ${new Date(banner.ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}` : "SPECIAL OFFER"}</div>
                    <div style={{ fontSize: "clamp(24px,4vw,36px)", lineHeight: 1.15, fontWeight: 800, color: "#fff", marginTop: 8 }}>{banner.title}</div>
                    {(banner.subtitle || banner.coupon_code) && <div style={{ fontSize: 15, color: "rgba(255,255,255,0.92)", marginTop: 8 }}>{banner.subtitle}{banner.coupon_code ? <> · Code <b>{banner.coupon_code}</b></> : null}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {searchBox(true)}
                    <a href={!banner.cta_link || banner.cta_link === "/booking" ? "/?page=booking" : banner.cta_link} onClick={() => api("/api/client/feed", { action: "click", banner_id: banner.id }).catch(() => {})} style={{ background: "#fff", color: "#1B1230", textDecoration: "none", fontWeight: 800, fontSize: 14.5, borderRadius: 12, padding: "0 22px", height: 48, display: "flex", alignItems: "center" }}>{banner.cta_label || "Book now"}</a>
                  </div>
                </div>
              </div>
            ) : <div style={{ display: "flex" }}>{searchBox(false)}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
              {[["Upcoming", String(upcoming.length), upcoming[0] ? `Next: ${(upcoming[0] as any).booking_date}` : "No upcoming bookings", "bookings", ""], ["Wallet balance", wallet == null ? "…" : `AED ${Number(wallet).toLocaleString()}`, "Credit for your next booking", "wallet", "#4ADE80"], ["Files ready", String(feed?.deliveries?.length || 0), "Delivered galleries", "files", ""], ["Notifications", String(feed?.unread || 0), "Unread", "", "#FBBF24"]].map(([l, v, sub, t, col]) => (
                <button key={l} onClick={() => t ? go(t as any) : setBellOpen(true)} style={{ ...card, textAlign: "left", color: "inherit", font: "inherit", cursor: "pointer" }}>
                  <div style={{ fontSize: 12.5, color: "#A892C6" }}>{l}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: col || "inherit" }}>{v}</div>
                  <div style={{ fontSize: 12, color: "#A892C6" }}>{sub}</div>
                </button>))}
            </div>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><b>Upcoming bookings</b><button onClick={() => go("bookings")} style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }}>See all</button></div>
              {!upcoming.length ? <div style={{ fontSize: 13, color: "#A892C6" }}>Nothing booked yet. <Link href="/?page=booking" style={{ color: "#C4B5FD" }}>Book a session →</Link></div> :
                upcoming.slice(0, 3).map((b: any) => <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 13.5 }}><span><b>{b.service_name}</b><br /><span style={{ color: "#A892C6", fontSize: 12.5 }}>{b.appointment_ref} · {b.booking_date} {String(b.booking_time || "").slice(0, 5)}</span></span><span style={{ alignSelf: "center", fontSize: 11, fontWeight: 700, color: b.status === "confirmed" ? "#4ADE80" : "#FBBF24" }}>{String(b.status).replace(/_/g, " ").toUpperCase()}</span></div>)}
            </div>
            <div className="cp-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <section style={{ ...card, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Wallet activity</h2><button onClick={() => go("wallet")} style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }}>Open</button></div>
                {!walletTx.length ? <div style={{ fontSize: 13, color: "#A892C6", padding: "10px 0" }}>No wallet activity yet.</div> : walletTx.slice(0, 3).map((t: any, n: number) => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: n < Math.min(walletTx.length, 3) - 1 ? "1px solid rgba(255,255,255,0.07)" : "none", fontSize: 13.5 }}><span>{t.note || t.kind}<br /><span style={{ fontSize: 11.5, color: "#8A7AA8" }}>{new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></span><b style={{ color: Number(t.amount) > 0 ? "#4ADE80" : "#F87171" }}>{Number(t.amount) > 0 ? "+" : ""}{Number(t.amount).toLocaleString("en-US")} AED</b></div>)}
              </section>
              <section style={{ ...card, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Requests</h2><button onClick={() => go("requests")} style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }}>Open</button></div>
                {!reqs.length ? <div style={{ fontSize: 13, color: "#A892C6", padding: "10px 0" }}>No requests. Reschedule or cancel from My Bookings.</div> : reqs.slice(0, 3).map((r: any) => { const c = ({ pending: "#FBBF24", approved: "#4ADE80", rejected: "#F87171" } as any)[r.status] || "#94A3B8"; return <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", fontSize: 13.5 }}><span>{r.kind === "cancel" ? "Cancellation" : "Reschedule"} · {r.appointments?.appointment_ref}<br /><span style={{ fontSize: 11.5, color: "#8A7AA8" }}>{r.kind === "reschedule" ? `to ${r.new_date} · ${String(r.new_time || "").slice(0, 5)}` : `fee ${Number(r.fee_percent)}%`}</span></span><span style={{ fontSize: 11, fontWeight: 700, color: c, border: `1px solid ${c}`, borderRadius: 20, padding: "3px 10px", textTransform: "uppercase" }}>{r.status}</span></div>; })}
              </section>
            </div>
          
          </div>)}

          {tab === "bookings" && (<>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>{searchBox(false)}<button onClick={loadBookings} style={{ ...btnGhost, padding: "6px 14px", fontSize: 12 }}>↻ Refresh</button></div>
            {bookingsErr && <div style={{ color: "#e74c3c", fontSize: 12.5, marginBottom: 14 }}>{bookingsErr}</div>}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{(["upcoming", "past", "cancelled"] as const).map((k) => <button key={k} onClick={() => setBFilter(k)} style={chip(bFilter === k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}</div>
            {bookingsLoading ? <div style={{ fontSize: 12.5, color: "#A892C6" }}>Loading…</div> : filtered.length === 0 ? (
              <div style={cardStyle}><p style={{ fontSize: 13, color: "#A892C6", margin: 0 }}>{q ? "No bookings match your search." : bFilter !== "upcoming" ? `No ${bFilter} bookings.` : <>No upcoming bookings. <Link href="/?page=booking" style={{ color: "var(--accent-primary, #8B5CF6)" }}>Book a session</Link> and it'll show up here.</>}</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filtered.map((b) => <BookingCard key={b.id} b={b} onReceiptChanged={loadBookings} onMessage={() => go("messages")} />)}
              </div>
            )}
          </>)}
          {tab === "files" && (<div style={{ display: "grid", gap: 12 }}>
            {!deliveries.length ? <div style={card}><span style={{ fontSize: 13, color: "#A892C6" }}>{q ? "No files match your search." : "Your final photos and videos will appear here as soon as they're delivered."}</span></div> :
              deliveries.map((d: any) => { const expired = d.expires_at && new Date(d.expires_at) < new Date(); return (
                <div key={d.id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 700 }}>{d.appointments?.service_name || "Your files"}</div>
                    <div style={{ fontSize: 12.5, color: "#A892C6" }}>{d.appointments?.appointment_ref} · {d.photos ? `${d.photos} photos` : ""}{d.videos ? ` · ${d.videos} videos` : ""} · {expired ? "link expired — message us for a new one" : d.expires_at ? `available until ${new Date(d.expires_at).toLocaleDateString("en-GB")}` : ""}</div></div>
                  {!expired && <a href={d.link} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}>Download files</a>}
                </div>); })}
          </div>)}
          {tab === "requests" && <RequestsPanel />}
          {tab === "wallet" && <WalletPanel />}
          {tab === "messages" && <MessageThread userEmail={user?.email} />}
          {tab === "inquiry" && <InquiryPanel bookings={bookings} onSent={() => go("messages")} />}
          {tab === "profile" && (<div style={{ display: "grid", gap: 14 }}><ProfileCard /><button className="cp-item" style={{ ...btnGhost, width: "auto", justifySelf: "start" }} onClick={async () => { await signOut(); window.location.href = "/login"; }}>Sign out</button></div>)}
        </section>
      </div>
      <nav className="cp-tabs" aria-label="Client menu">
        {MOBILE.map((k) => { const m = MENU.find((x) => x[0] === k)!; return <button key={k} className={`cp-tab${tab === k ? " on" : ""}`} onClick={() => go(k)}><Icon d={m[1]} size={22} /><span>{k === "dashboard" ? "Home" : k === "bookings" ? "Bookings" : k === "files" ? "Files" : k === "wallet" ? "Wallet" : "Me"}</span></button>; })}
      </nav>
    </main>
  );
}
