"use client";
// CMS > Companies -- "Send email" bar for the companies you ticked (one or many).
// Pick a saved template or a ready-made design (e.g. a service Proposal), see who gets it,
// then send. Uses the normal campaign sender, so every safety rule applies: one-by-one
// personal emails, unsubscribe link, daily limit, skips unsubscribed / bounced / inactive /
// dead domains, auto-stop on failures. Each send is logged as a campaign you can review.
import { useEffect, useState } from "react";

type Starter = { key: string; name: string; subject: string; blocks: any[] };
const box = { background: "#1B1230", border: "1px solid rgba(139,92,246,0.45)", borderRadius: 12, padding: 14, display: "grid", gap: 10 } as const;
const btn = (pri = false) => ({ height: 38, borderRadius: 8, padding: "0 14px", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", border: pri ? "none" : "1px solid rgba(255,255,255,0.18)", background: pri ? "#8B5CF6" : "transparent", color: "#fff" }) as const;
const inp = { height: 38, borderRadius: 8, border: "1px solid rgba(255,255,255,0.16)", background: "#221640", color: "#F5F1FB", padding: "0 10px", font: "inherit", fontSize: 13 } as const;

export default function CompanyBulkSend({ token, selected, companies, starters, onClear, onSent }: {
  token: string; selected: string[]; companies: any[]; starters: Starter[]; onClear: () => void; onSent: () => void;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [choice, setChoice] = useState(""); // "t:<id>" saved template, "s:<key>" ready-made design
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => { fetch("/api/admin/email/templates", { headers: H }).then((r) => r.json()).then((d) => setTemplates(d.templates || [])).catch(() => {}); }, []); // eslint-disable-line

  const picked = companies.filter((c) => selected.includes(c.id));
  const withEmail = picked.filter((c) => c.email || (c.contact_count || 0) > 0).length;
  const noEmail = picked.length - withEmail;
  const label = choice.startsWith("t:") ? templates.find((t) => "t:" + t.id === choice)?.name : starters.find((s) => "s:" + s.key === choice)?.name;

  const send = async () => {
    setBusy("Preparing…"); setMsg(null);
    try {
      let templateId = choice.slice(2);
      if (choice.startsWith("s:")) { // a ready-made design is saved as a template first (stays editable later)
        const st = starters.find((s) => s.key === templateId)!;
        const existing = templates.find((t) => t.name === st.name);
        if (existing) templateId = existing.id;
        else {
          const r = await fetch("/api/admin/email/templates", { method: "POST", headers: H, body: JSON.stringify({ name: st.name, subject: st.subject, blocks: st.blocks }) });
          const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save the design");
          templateId = d.template?.id || d.id || d.templates?.[0]?.id; if (!templateId) throw new Error("Design saved but no id returned — pick it from saved templates.");
        }
      }
      const name = `${label} → ${picked.length === 1 ? picked[0].name : `${picked.length} companies`} · ${new Date().toLocaleDateString("en-GB")}`;
      const cr = await fetch("/api/admin/email/campaigns", { method: "POST", headers: H, body: JSON.stringify({ name: name.slice(0, 140), template_id: templateId, category: "marketing", audience: { type: "outreach_companies", company_ids: selected } }) });
      const cd = await cr.json(); if (!cr.ok) throw new Error(cd.error || "Could not create the send");
      setBusy(`Sending to ${withEmail}… (one by one, please keep this tab open)`);
      const sr = await fetch(`/api/admin/email/campaigns/${cd.campaign.id}/send`, { method: "POST", headers: H });
      const sd = await sr.json().catch(() => ({})); if (!sr.ok) throw new Error(sd.error || `Send failed (${sr.status})`);
      setMsg({ ok: true, text: `✓ Sent ${sd.sent}${sd.failed ? ` · ${sd.failed} failed` : ""}${sd.skipped_no_email ? ` · ${sd.skipped_no_email} skipped (no valid email)` : ""}${sd.skipped_no_consent ? ` · ${sd.skipped_no_consent} do-not-contact` : ""}.${sd.note ? " " + sd.note : ""} Details in Email Designer → Campaigns.` });
      setConfirming(false); onSent();
    } catch (e: any) { setMsg({ ok: false, text: e.message || "Failed" }); }
    setBusy("");
  };

  if (!selected.length) return null;
  return (
    <div style={{ ...box, position: "sticky", top: 10, zIndex: 5, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ fontSize: 14 }}>✉ Email {picked.length} selected compan{picked.length === 1 ? "y" : "ies"}</b>
        <select value={choice} onChange={(e) => { setChoice(e.target.value); setConfirming(false); }} style={{ ...inp, minWidth: 260, flex: 1 }}>
          <option value="">Choose what to send…</option>
          <optgroup label="Proposals & ready-made designs">{starters.map((s) => <option key={s.key} value={"s:" + s.key}>{s.name}</option>)}</optgroup>
          {templates.length > 0 && <optgroup label="My saved templates">{templates.map((t) => <option key={t.id} value={"t:" + t.id}>{t.name}</option>)}</optgroup>}
        </select>
        {!confirming ? <button disabled={!choice || !!busy || !withEmail} onClick={() => setConfirming(true)} style={btn(true)}>Send…</button> : null}
        <button disabled={!!busy} onClick={onClear} style={btn()}>Clear selection</button>
      </div>
      <div style={{ fontSize: 12, color: "#C4B5FD" }}>{withEmail} can receive email{noEmail ? ` · ${noEmail} have no email yet (run Lead Finder → Auto-fill)` : ""}. Each person gets their own personal email with their name and company.</div>
      {confirming && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: 10, borderRadius: 8, background: "rgba(139,92,246,0.1)" }}>
          <span style={{ fontSize: 13 }}>Send <b>{label}</b> to <b>{withEmail}</b> compan{withEmail === 1 ? "y" : "ies"} now?</span>
          <button disabled={!!busy} onClick={send} style={{ ...btn(true), background: "#16A34A" }}>{busy ? "Sending…" : "Yes, send"}</button>
          <button disabled={!!busy} onClick={() => setConfirming(false)} style={btn()}>Back</button>
        </div>
      )}
      {busy && <div style={{ fontSize: 12.5, color: "#FBBF24" }}>{busy}</div>}
      {msg && <div style={{ fontSize: 12.5, color: msg.ok ? "#4ADE80" : "#F87171" }}>{msg.text}</div>}
    </div>
  );
}
