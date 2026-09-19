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
      {payment?.status === "rejected" && (
        <div style={{ marginTop: 6 }}>
          {payment.rejection_reason && (
            <div style={{ fontSize: 12.5, color: "#e74c3c", marginBottom: 4 }}>Reason: {payment.rejection_reason}</div>
          )}
          <ReceiptReupload appointmentId={b.id} onDone={onReceiptChanged} />
        </div>
      )}
      {b.status === "pending_payment" && payment?.method === "bank_transfer" && !payment?.receipt_path && (
        <ReceiptReupload appointmentId={b.id} onDone={onReceiptChanged} />
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

export default function ClientPortalPage() {
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

  return (
    <main style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Welcome{user?.email ? `, ${user.email}` : ""}</h1>
            <p style={{ color: "var(--text-muted, #A892C6)", fontSize: 13.5 }}>Your bookings, payments and messages, in one place.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/contact" style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>New Inquiry</Link>
            <button
              onClick={async () => { await signOut(); window.location.href = "/login"; }}
              style={btnGhost}
            >
              Sign out
            </button>
          </div>
        </div>

        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted, #A892C6)" }}>Your Bookings</h2>
            <button onClick={loadBookings} style={{ ...btnGhost, padding: "6px 12px", fontSize: 11 }}>↻ Refresh</button>
          </div>
          {bookingsErr && <div style={{ color: "#e74c3c", fontSize: 12.5, marginBottom: 14 }}>{bookingsErr}</div>}
          {bookingsLoading ? (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading…</div>
          ) : bookings.length === 0 ? (
            <div style={cardStyle}>
              <p style={{ fontSize: 13, color: "var(--text-muted, #A892C6)", margin: 0 }}>
                No bookings yet. <Link href="/booking" style={{ color: "var(--accent-primary, #8B5CF6)" }}>Book a session</Link> and it'll show up here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {bookings.map((b) => (
                <BookingCard key={b.id} b={b} onReceiptChanged={loadBookings} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 13, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted, #A892C6)", marginBottom: 14 }}>Messages</h2>
          <MessageThread userEmail={user?.email} />
        </section>
      </div>
    </main>
  );
}
