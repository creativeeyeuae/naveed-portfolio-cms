"use client";
// Gmail-style "New message" window for CMS > Email. Pick recipients (clients or any address),
// a saved template, tweak the subject, see a live preview, Send. Sends through
// /api/admin/email/send-one (one personalised email per recipient, max 25).
import { useEffect, useMemo, useRef, useState } from "react";
import { renderTemplate as renderEmailHtml } from "@/functions/_shared/emailRender";

type Rcpt = { email: string; name: string };
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

export default function EmailCompose({ token, templates, clients, initialTemplateId, initialTo, onClose, onSent }: {
  token: string; templates: any[]; clients: any[]; initialTemplateId?: string; initialTo?: Rcpt[]; onClose: () => void; onSent: (msg: string) => void;
}) {
  const [to, setTo] = useState<Rcpt[]>(initialTo || []);
  const [q, setQ] = useState("");
  const [tplId, setTplId] = useState(initialTemplateId || templates[0]?.id || "");
  const tpl = templates.find((t) => t.id === tplId);
  const [subject, setSubject] = useState(tpl?.subject || "");
  const [mode, setMode] = useState<"normal" | "min" | "max">("normal");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setSubject(tpl?.subject || tpl?.name || ""); }, [tplId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sugg = useMemo(() => {
    const s = q.trim().toLowerCase(); if (!s) return [];
    return (clients || []).filter((c: any) => c.email && !to.some((r) => r.email === String(c.email).toLowerCase()) && `${c.full_name || ""} ${c.email}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, clients, to]);
  const add = (email: string, name = "") => { const e = email.trim().toLowerCase(); if (!EMAIL_RE.test(e) || to.some((r) => r.email === e)) return false; setTo((t) => [...t, { email: e, name }]); setQ(""); return true; };
  const commit = () => { const raw = q.trim().replace(/[,;]$/, ""); if (raw) { if (!add(raw)) setErr("That doesn't look like an email address."); else setErr(""); } };
  const preview = useMemo(() => tpl ? renderEmailHtml((tpl.blocks || []) as any, { first_name: (to[0]?.name || "Sarah").split(" ")[0], last_name: "", company: "", job_title: "" }) : "", [tpl, to]);
  const send = async () => {
    if (q.trim()) commit();
    if (!to.length) { setErr("Add at least one recipient."); return; }
    if (!tplId) { setErr("Choose a template."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/admin/email/send-one", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ template_id: tplId, to, subject }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not send.");
      onSent(j.failed ? `Sent ${j.sent}, failed ${j.failed}.` : `Message sent to ${j.sent} recipient${j.sent === 1 ? "" : "s"}.`);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const cls = `gm-compose gm-${mode}`;
  return (
    <div className={cls} role="dialog" aria-label="New message">
      <div className="gm-c-head" onClick={() => mode === "min" && setMode("normal")}>
        <span>{subject || "New message"}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button aria-label="Minimise" onClick={(e) => { e.stopPropagation(); setMode(mode === "min" ? "normal" : "min"); }}>—</button>
          <button aria-label="Full screen" className="gm-hide-m" onClick={(e) => { e.stopPropagation(); setMode(mode === "max" ? "normal" : "max"); }}>⤢</button>
          <button aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
        </div>
      </div>
      {mode !== "min" && <>
        <div className="gm-c-row" onClick={() => inputRef.current?.focus()}>
          <span className="gm-c-lbl">To</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, alignItems: "center", position: "relative" }}>
            {to.map((r) => <span key={r.email} className="gm-chip" title={r.email}><b>{(r.name || r.email)[0].toUpperCase()}</b>{r.name || r.email}<button aria-label={`Remove ${r.email}`} onClick={() => setTo((t) => t.filter((x) => x.email !== r.email))}>×</button></span>)}
            <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setErr(""); }} onKeyDown={(e) => { if (["Enter", ",", ";", "Tab"].includes(e.key) && q.trim()) { e.preventDefault(); commit(); } if (e.key === "Backspace" && !q && to.length) setTo((t) => t.slice(0, -1)); }} onBlur={() => setTimeout(commit, 150)} placeholder={to.length ? "" : "Client name or email"} className="gm-c-in" />
            {sugg.length > 0 && <div className="gm-sugg">{sugg.map((c: any) => <button key={c.id} onMouseDown={(e) => { e.preventDefault(); add(c.email, c.full_name || ""); }}><span className="gm-av">{(c.full_name || c.email)[0].toUpperCase()}</span><span><b>{c.full_name || "—"}</b><br /><small>{c.email}</small></span></button>)}</div>}
          </div>
        </div>
        <div className="gm-c-row"><span className="gm-c-lbl">Template</span>
          <select value={tplId} onChange={(e) => setTplId(e.target.value)} className="gm-c-in" style={{ flex: 1 }}>
            {!templates.length && <option value="">No templates yet</option>}
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="gm-c-row"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="gm-c-in" style={{ flex: 1, fontWeight: 600 }} /></div>
        <div className="gm-c-body">{preview ? <iframe title="Preview" sandbox="" srcDoc={preview} /> : <div style={{ padding: 24, color: "#888" }}>Choose a template to preview it here.</div>}</div>
        <div className="gm-c-foot">
          <button className="gm-send" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</button>
          <span style={{ fontSize: 12, color: err ? "#dc2626" : "#6b7280", flex: 1 }}>{err || (to.length ? `${to.length} recipient${to.length === 1 ? "" : "s"} · personalised with their first name` : "Tip: type a client's name to find them")}</span>
          <button className="gm-ico" aria-label="Discard" title="Discard" onClick={onClose}>🗑</button>
        </div>
      </>}
    </div>
  );
}
