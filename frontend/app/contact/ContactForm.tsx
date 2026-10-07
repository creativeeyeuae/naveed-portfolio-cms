"use client";
// The real, working contact form for the standalone /contact route -- ports the exact
// pipeline app/page.tsx's own submitContact() already uses for the homepage SPA's in-memory
// Contact page-view: a real Supabase write (here via lib/cmsData.ts's submitContactLead(),
// which mirrors addContactLead()'s read-modify-write against
// site_settings/"nap_contact_submissions" using the same public anon key the CMS itself uses
// for unauthenticated writes), which then triggers the server to forward the lead to Naveed
// on WhatsApp through the bridge (see submitContactLead -> /api/notify/trigger's "new_lead"
// handling) -- no longer a WhatsApp deep link (window.open) that depended on the visitor's own
// browser/device opening WhatsApp Web or the app. Replaces the old, disconnected
// react-hook-form + dead-Worker-API version, which never actually delivered a single lead.
import { useState } from "react";
import { PublicSiteInfo, submitContactLead } from "@/lib/cmsData";
import { COUNTRY_CODES } from "@/lib/countryCodes";

// Split into two separate pickers per Naveed's request: a "Category" chip group (what kind
// of message this is) and a "Project Type" dropdown (which service, if any, it's about) --
// "Booking" still leads the category list, and the project types mirror the Booking form's
// own service picker so someone contacting directly can flag exactly what they need without
// starting the full multi-step booking flow.
const CATEGORIES = ["Booking", "General Inquiry", "Collaboration", "Media", "Partnership", "Press"];
const PROJECT_TYPES = [
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
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", projectType: "", message: "" });
  // WhatsApp number is captured as a country selector + local digits, then combined into
  // form.phone on submit as "+<dial> <digits>" -- no new field/column, just a friendlier input
  // so visitors don't type a number missing (or with the wrong) country code.
  const [waIso, setWaIso] = useState("AE");
  const [waDigits, setWaDigits] = useState("");
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
    const dial = COUNTRY_CODES.find((c) => c.iso2 === waIso)?.dial || "971";
    const phone = waDigits.trim() ? `+${dial} ${waDigits.trim()}` : "";
    const entry = { id: String(Date.now()), date: new Date().toISOString(), ...form, phone };
    // WhatsApp alert now goes out automatically from the server, through the bridge, once
    // this lead is saved below -- see submitContactLead -> /api/notify/trigger's "new_lead"
    // handling. No WhatsApp Web deep link is opened here any more.
    setSending(true);
    await submitContactLead(entry);
    setSending(false);
    setSent(true);
    setForm({ name: "", email: "", phone: "", subject: "", projectType: "", message: "" });
    setWaDigits("");
    refreshCaptcha();
  }

  if (sent) {
    return (
      <div className="adv-form-card" style={{ textAlign: "center" }}>
        <div className="adv-eyebrow" style={{ textAlign: "center" }}>Thank You</div>
        <h3 className="adv-heading" style={{ textAlign: "center" }}>Message Sent</h3>
        <p className="adv-subtext" style={{ textAlign: "center" }}>Thanks for reaching out -- I&apos;ll get back to you shortly.</p>
        <button onClick={() => setSent(false)} className="adv-btn-outline">Send Another Message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="adv-form-card">
      <div className="adv-eyebrow">Send a Message</div>
      <h3 className="adv-heading">Tell Me About Your Project</h3>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 22 }}>
        <label className="adv-label">Category *</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {CATEGORIES.map((s) => (
            <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, subject: s }))}
              className={`adv-chip${form.subject === s ? " is-active" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, marginBottom: 26 }}>
        <label className="adv-label">Project Type</label>
        <select className="adv-input" value={form.projectType}
          onChange={(e) => setForm((f) => ({ ...f, projectType: e.target.value }))}>
          <option value="">Select a project type (optional)</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
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
        <label className="adv-label">WhatsApp Number</label>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            className="adv-input"
            aria-label="Country code"
            style={{ flex: "1 1 0", minWidth: 0 }}
            value={waIso}
            onChange={(e) => setWaIso(e.target.value)}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>
          <input
            className="adv-input"
            style={{ flex: 1 }}
            type="tel"
            inputMode="tel"
            placeholder="e.g. 50 123 4567"
            value={waDigits}
            onChange={(e) => setWaDigits(e.target.value.replace(/[^\d\s]/g, ""))}
          />
        </div>
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
