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

// "Booking" leads straight to the same subjects the Booking form's service picker offers, so
// someone contacting directly can flag exactly what they need without starting the full
// multi-step booking flow -- Naveed's request to reuse that services list here too.
const SUBJECTS = [
  "Booking", "General Inquiry", "Collaboration", "Media", "Partnership", "Press",
  "Photography", "Videography", "Photography + Videography", "Cinematography",
  "Social Media Content", "Event Coverage", "Real Estate Photography", "Product Photography",
  "Fashion Photography", "Corporate Photography",
];

// Lightweight, no-signup human check -- catches bots without a third-party CAPTCHA:
// 1) a simple arithmetic question a script can't pre-solve without parsing the DOM,
// 2) a honeypot field real visitors never see or fill but bots auto-fill,
// 3) a minimum time-on-page before submit (bots tend to submit near-instantly).
function randDigit() { return 1 + Math.floor(Math.random() * 8); }

export default function ContactForm({ site }: { site: PublicSiteInfo }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [hp, setHp] = useState(""); // honeypot -- must stay empty
  const [mountedAt] = useState(() => Date.now());
  const [captchaA, setCaptchaA] = useState(randDigit);
  const [captchaB, setCaptchaB] = useState(randDigit);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  function refreshCaptcha() { setCaptchaA(randDigit()); setCaptchaB(randDigit()); setCaptchaAnswer(""); }

  const canSubmit = !!(form.name.trim() && form.email.trim() && form.message.trim() && captchaAnswer.trim()) && !sending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    if (hp.trim()) return; // honeypot tripped -- silently drop, no feedback for bots
    if (Date.now() - mountedAt < 1200) return; // submitted too fast to be a real person
    if (Number(captchaAnswer) !== captchaA + captchaB) { setCaptchaError("That's not quite right -- please try again."); refreshCaptcha(); return; }
    setCaptchaError("");
    const entry = { id: String(Date.now()), date: new Date().toISOString(), ...form };
    const waMsg = `New website contact form message:\nName: ${entry.name}\nEmail: ${entry.email}\nPhone: ${entry.phone || "-"}\nSubject: ${entry.subject || "-"}\nMessage: ${entry.message}`;
    window.open(`https://wa.me/${site.waNumber}?text=${encodeURIComponent(waMsg)}`, "_blank");
    setSending(true);
    await submitContactLead(entry);
    setSending(false);
    setSent(true);
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    refreshCaptcha();
  }

  if (sent) {
    return (
      <div className="adv-form-card" style={{ textAlign: "center" }}>
        <div className="adv-eyebrow" style={{ textAlign: "center" }}>Thank You</div>
        <h3 className="adv-heading" style={{ textAlign: "center" }}>Message Sent</h3>
        <p className="adv-subtext" style={{ textAlign: "center" }}>Thanks for reaching out -- I&apos;ll get back to you shortly. Your message was also opened in WhatsApp for a faster reply.</p>
        <button onClick={() => setSent(false)} className="adv-btn-outline">Send Another Message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="adv-form-card">
      <div className="adv-eyebrow">Send a Message</div>
      <h3 className="adv-heading">Tell Me About Your Project</h3>

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
        {SUBJECTS.map((s) => (
          <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, subject: s }))}
            className={`adv-chip${form.subject === s ? " is-active" : ""}`}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label className="adv-label">Name *</label>
          <input className="adv-input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="adv-label">Email *</label>
          <input className="adv-input" required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 16 }}>
        <label className="adv-label">Phone</label>
        <input className="adv-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </div>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 26 }}>
        <label className="adv-label">Message *</label>
        <textarea className="adv-input" required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} style={{ resize: "vertical" }} />
      </div>

      {/* Honeypot -- invisible to real visitors (off-screen, unfocusable, not announced to
          screen readers), but a form-filling bot will find and fill it like any other field.
          A filled value silently drops the submission in handleSubmit above. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 26 }}>
        <label className="adv-label">Quick human check *</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#fff", fontSize: 14, whiteSpace: "nowrap" }}>{captchaA} + {captchaB} =</span>
          <input className="adv-input" required inputMode="numeric" style={{ maxWidth: 90 }} value={captchaAnswer}
            onChange={(e) => { setCaptchaAnswer(e.target.value.replace(/[^\d]/g, "")); setCaptchaError(""); }} placeholder="?" />
        </div>
        {captchaError && <p style={{ color: "#f87171", fontSize: 12.5, marginTop: 8 }}>{captchaError}</p>}
      </div>

      <button type="submit" disabled={!canSubmit} className="adv-btn-primary" style={{ width: "100%" }}>
        {sending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
