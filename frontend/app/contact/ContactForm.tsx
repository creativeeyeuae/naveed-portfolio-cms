"use client";
// The real, working contact form for the standalone /contact route -- ports the exact
// pipeline app/page.tsx's own submitContact() already uses for the homepage SPA's in-memory
// Contact page-view: a WhatsApp deep link (window.open) plus a real Supabase write (here via
// lib/cmsData.ts's submitContactLead(), which mirrors addContactLead()'s read-modify-write
// against site_settings/"nap_contact_submissions" using the same public anon key the CMS
// itself uses for unauthenticated writes). Replaces the old, disconnected react-hook-form +
// dead-Worker-API version, which never actually delivered a single lead.
import { useState } from "react";
import { PublicSiteInfo, submitContactLead } from "@/lib/cmsData";

const C = {
  P: "var(--c-p,#8B5CF6)",
  PL: "var(--c-pl,#E2D9F3)",
  FG: "var(--c-fg,#FFFFFF)",
  MID: "var(--c-mid,#A892C6)",
  DARK: "var(--c-dark,#140D21)",
  BORDER: "var(--c-border,#2D1F45)",
};

const SUBJECTS = ["General Inquiry", "Collaboration", "Media", "Press"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${C.BORDER}`,
  color: C.FG,
  padding: "13px 16px",
  fontSize: 14,
  borderRadius: 2,
  outline: "none",
  boxSizing: "border-box",
};

export default function ContactForm({ site }: { site: PublicSiteInfo }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = !!(form.name.trim() && form.email.trim() && form.message.trim()) && !sending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    const entry = { id: String(Date.now()), date: new Date().toISOString(), ...form };
    const waMsg = `New website contact form message:\nName: ${entry.name}\nEmail: ${entry.email}\nPhone: ${entry.phone || "-"}\nSubject: ${entry.subject || "-"}\nMessage: ${entry.message}`;
    window.open(`https://wa.me/${site.waNumber}?text=${encodeURIComponent(waMsg)}`, "_blank");
    setSending(true);
    await submitContactLead(entry);
    setSending(false);
    setSent(true);
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  }

  if (sent) {
    return (
      <div style={{ border: `1px solid ${C.BORDER}`, background: C.DARK, padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 14 }}>Thank You</div>
        <h3 style={{ fontSize: "clamp(20px,2.6vw,28px)", fontWeight: 700, margin: "0 0 12px" }}>Message Sent</h3>
        <p style={{ color: C.MID, fontSize: 14, margin: "0 0 24px" }}>Thanks for reaching out -- I'll get back to you shortly. Your message was also opened in WhatsApp for a faster reply.</p>
        <button onClick={() => setSent(false)} style={{ background: "none", border: `1px solid ${C.BORDER}`, color: C.FG, padding: "11px 28px", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", borderRadius: 2 }}>Send Another Message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: `1px solid ${C.BORDER}`, background: C.DARK, padding: "40px 32px" }}>
      <div style={{ fontSize: 11, letterSpacing: 6, color: C.PL, textTransform: "uppercase", marginBottom: 10 }}>Send a Message</div>
      <h3 style={{ fontSize: "clamp(20px,2.6vw,26px)", fontWeight: 700, margin: "0 0 26px" }}>Tell Me About Your Project</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {SUBJECTS.map((s) => (
          <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, subject: s }))}
            style={{
              background: form.subject === s ? C.P : "transparent",
              border: `1px solid ${form.subject === s ? C.P : C.BORDER}`,
              color: form.subject === s ? "#09060E" : C.MID,
              padding: "8px 16px",
              fontSize: 12,
              letterSpacing: 1,
              cursor: "pointer",
              borderRadius: 20,
            }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, letterSpacing: 2, color: C.MID, textTransform: "uppercase", marginBottom: 8 }}>Name *</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, letterSpacing: 2, color: C.MID, textTransform: "uppercase", marginBottom: 8 }}>Email *</label>
          <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, letterSpacing: 2, color: C.MID, textTransform: "uppercase", marginBottom: 8 }}>Phone</label>
        <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, letterSpacing: 2, color: C.MID, textTransform: "uppercase", marginBottom: 8 }}>Message *</label>
        <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <button type="submit" disabled={!canSubmit} style={{ background: canSubmit ? C.P : C.BORDER, border: "none", color: canSubmit ? "#09060E" : C.MID, padding: "14px 36px", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", cursor: canSubmit ? "pointer" : "not-allowed", borderRadius: 2, width: "100%" }}>
        {sending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
