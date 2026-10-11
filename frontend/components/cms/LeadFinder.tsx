"use client";
// CMS > Lead Finder -- find companies by niche + area, find their public business emails,
// review, then save the ticked ones into Contacts with a tag (Email Designer > Campaigns can then
// target that tag). Nothing is emailed from here.
import { useRef, useState } from "react";

type Lead = { name: string; website: string; phone: string; email: string; address: string; rating: string; source: string; already?: boolean; mx?: boolean; checked?: boolean; pick?: boolean; alt?: string[] };
const NICHES = ["Interior design", "Real estate", "Architecture", "Hotel", "Restaurant", "Events", "Corporate", "Fashion", "Beauty"];
const card = { background: "#1B1230", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 } as const;
const inp = { height: 42, borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "#F5F1FB", font: "inherit", fontSize: 14, padding: "0 12px" } as const;
const btn = (pri = false) => ({ height: 40, borderRadius: 8, padding: "0 16px", font: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer", border: pri ? "none" : "1px solid rgba(255,255,255,0.18)", background: pri ? "#8B5CF6" : "transparent", color: "#fff" }) as const;

export default function LeadFinder({ token }: { token: string }) {
  const [niche, setNiche] = useState("Interior design"); const [area, setArea] = useState("Dubai"); const [source, setSource] = useState<"osm" | "google">("google");
  const [leads, setLeads] = useState<Lead[]>([]); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState(""); const [manual, setManual] = useState(""); const [google, setGoogle] = useState<boolean | null>(null);
  const call = async (body: any) => { const r = await fetch("/api/admin/lead-finder", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || (r.status === 401 ? "Your CMS login expired — please sign in again." : `Server error (${r.status}) — please try again.`)); return j; };
  const search = async () => { setBusy("Searching…"); setMsg(""); try { const j = await call({ action: "search", niche, area, source, limit: 150 }); setGoogle(j.google); setLeads(j.leads.map((l: Lead) => ({ ...l, pick: !l.already }))); setMsg(`Found ${j.leads.length} companies (${j.leads.filter((l: Lead) => l.website).length} with a website). Next: click "Find emails".${source === "osm" ? " Tip: OpenStreetMap has very little contact data — choose Google Places for websites and phone numbers." : ""}`); } catch (e: any) { setMsg(e.message); } setBusy(""); };
  const addManual = () => { const rows = manual.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((s) => { const [name, website] = s.includes("|") ? s.split("|").map((x) => x.trim()) : [s.replace(/^https?:\/\/(www\.)?/, "").split("/")[0], s]; return { name, website: /^https?:/.test(website) ? website : "https://" + website, phone: "", email: "", address: "", rating: "", source: "Manual", pick: true } as Lead; }); setLeads((l) => [...rows, ...l]); setManual(""); };
  const enrich = async () => {
    const todo = leads.map((l, i) => ({ l, i })).filter(({ l }) => l.pick && !l.checked && (l.website || l.email));
    for (let k = 0; k < todo.length; k += 4) {
      setBusy(`Finding emails… ${Math.min(k + 4, todo.length)} / ${todo.length}`);
      try { const j = await call({ action: "enrich", leads: todo.slice(k, k + 4).map(({ l }) => ({ website: l.website, email: l.email })) });
        setLeads((cur) => { const n = [...cur]; j.results.forEach((r: any, x: number) => { const i = todo[k + x].i; n[i] = { ...n[i], email: r.email, alt: r.alt, mx: r.mx, checked: true, pick: n[i].pick && !!r.email && r.mx }; }); return n; });
      } catch { /* one slow batch: mark checked and keep going */ setLeads((cur) => { const n = [...cur]; todo.slice(k, k + 4).forEach(({ i }) => { n[i] = { ...n[i], checked: true }; }); return n; }); }
    }
    setBusy(""); setMsg("Done. Only companies with a valid email stay ticked — review them before saving.");
  };
  const save = async () => {
    const pick = leads.filter((l) => l.pick); if (!pick.length) { setMsg("Tick at least one company."); return; }
    const tag = `Leads · ${niche} · ${area}`;
    if (!confirm(`Save ${pick.length} companies to Contacts with tag "${tag}"?\nNothing will be emailed.`)) return;
    setBusy("Saving…"); try { const j = await call({ action: "save", leads: pick, tag, niche, area }); setMsg(`✓ Saved ${j.saved} (skipped ${j.skipped} duplicates) with tag "${j.tag}". Use it in Email Designer → Campaigns.`); setLeads((c) => c.map((l) => (l.pick ? { ...l, already: true, pick: false } : l))); setBusy(""); autofill(false); return; } catch (e: any) { setMsg(e.message); } setBusy("");
  };
  // Auto-fill: visits every saved company's own website and fills in the missing email,
  // mobile/WhatsApp, landline and contact person. Runs 2 companies at a time; free.
  const [af, setAf] = useState<{ running: boolean; done: number; total: number; email: number; mobile: number; land: number; person: number }>({ running: false, done: 0, total: 0, email: 0, mobile: 0, land: 0, person: 0 });
  const stopRef = useRef(false);
  const autofill = async (force = false) => {
    stopRef.current = false;
    try {
      const { ids } = await call({ action: "autofill_list", force });
      const st = { running: true, done: 0, total: ids.length, email: 0, mobile: 0, land: 0, person: 0 }; setAf({ ...st });
      for (let k = 0; k < ids.length && !stopRef.current; k += 2) {
        try { const j = await call({ action: "autofill", ids: ids.slice(k, k + 2) });
          for (const r of j.results || []) { if (r.email) st.email++; if (r.mobile) st.mobile++; if (r.landline) st.land++; if (r.person) st.person++; }
        } catch { /* skip a slow website and keep going */ }
        st.done = Math.min(k + 2, ids.length); setAf({ ...st });
      }
      st.running = false; setAf({ ...st });
    } catch (e: any) { setMsg(e.message); setAf((a) => ({ ...a, running: false })); }
  };
  const ticked = leads.filter((l) => l.pick).length, withEmail = leads.filter((l) => l.email && l.mx).length;
  return (
    <div style={{ maxWidth: 1180, margin: "32px auto", padding: "0 20px", fontFamily: "Manrope, system-ui, sans-serif", color: "#F5F1FB", display: "grid", gap: 16 }}>
      <div><h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>🎯 Lead Finder</h1><div style={{ color: "#A892C6", fontSize: 13.5, marginTop: 4 }}>Find companies by niche and area, collect their public business emails, then save them to Contacts for a campaign. Nothing is sent from here.</div></div>
      <div style={{ ...card, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div><div style={{ fontWeight: 800, fontSize: 16 }}>✨ Auto-fill missing details</div><div style={{ color: "#A892C6", fontSize: 13 }}>Checks each saved company's own website (home, contact, about, team pages) and fills in the missing email, mobile / WhatsApp, landline and contact person name. Free. Companies already checked are skipped next time.</div></div>
          {af.running ? <button onClick={() => { stopRef.current = true; }} style={btn(false)}>Stop</button>
            : <div style={{ display: "flex", gap: 8 }}><button onClick={() => autofill(false)} style={btn(true)}>Auto-fill all companies</button><button onClick={() => autofill(true)} style={btn(false)} title="Check every company again, including ones checked before">Re-check all</button></div>}
        </div>
        {af.total > 0 && <>
          <div style={{ height: 8, background: "#221640", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${(af.done / af.total) * 100}%`, height: "100%", background: "#8B5CF6", transition: "width .3s" }} /></div>
          <div style={{ fontSize: 13, color: "#C4B5FD" }}>{af.running ? "Working…" : "Finished."} {af.done} / {af.total} companies · found <b>{af.email}</b> emails · <b>{af.mobile}</b> mobiles · <b>{af.land}</b> landlines · <b>{af.person}</b> contact names</div>
        </>}
        {af.total === 0 && !af.running && af.done === 0 && null}
      </div>
      <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#C4B5FD", fontWeight: 600 }}>Niche<input list="lf-niches" value={niche} onChange={(e) => setNiche(e.target.value)} style={{ ...inp, width: 220 }} /><datalist id="lf-niches">{NICHES.map((n) => <option key={n} value={n} />)}</datalist></label>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#C4B5FD", fontWeight: 600 }}>Area<input value={area} onChange={(e) => setArea(e.target.value)} style={{ ...inp, width: 180 }} /></label>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#C4B5FD", fontWeight: 600 }}>Source<select value={source} onChange={(e) => setSource(e.target.value as any)} style={{ ...inp, background: "#221640" }}><option value="google">Google Places (best — websites & phones)</option><option value="osm">OpenStreetMap (free, little contact data)</option></select></label>
        <button onClick={search} disabled={!!busy} style={btn(true)}>Search</button>
        {leads.length > 0 && <><button onClick={enrich} disabled={!!busy} style={btn()}>✉ Find emails</button><button onClick={save} disabled={!!busy || !ticked} style={{ ...btn(true), background: "#16A34A" }}>Save {ticked} to Contacts</button></>}
      </div>
      <details style={card}><summary style={{ cursor: "pointer", fontWeight: 700 }}>➕ Add companies manually (paste websites, one per line)</summary>
        <textarea value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"Company name | https://website.com\nhttps://anotherstudio.ae"} style={{ ...inp, height: 110, width: "100%", boxSizing: "border-box", padding: 12, marginTop: 10 }} />
        <button onClick={addManual} style={{ ...btn(), marginTop: 8 }}>Add to list</button></details>
      {(busy || msg) && <div style={{ fontSize: 13.5, color: busy ? "#FBBF24" : msg.startsWith("✓") ? "#4ADE80" : "#E2D9F3" }}>{busy || msg}</div>}
      {leads.length > 0 && <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "12px 16px", fontSize: 13, color: "#A892C6", display: "flex", gap: 16, flexWrap: "wrap" }}><span>{leads.length} companies</span><span>{withEmail} with a verified email</span><span>{ticked} ticked</span>
          <button onClick={() => setLeads((c) => c.map((l) => ({ ...l, pick: !!(l.email && l.mx && !l.already) })))} style={{ ...btn(), height: 28, fontSize: 12 }}>Tick only verified emails</button></div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: "left", color: "#A892C6", fontSize: 12 }}>{["", "Company", "Website", "Email", "Phone", "Status"].map((h) => <th key={h} style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{h}</th>)}</tr></thead>
          <tbody>{leads.map((l, i) => <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", opacity: l.already ? 0.5 : 1 }}>
            <td style={{ padding: "8px 12px" }}><input type="checkbox" checked={!!l.pick} disabled={l.already} onChange={(e) => setLeads((c) => c.map((x, k) => (k === i ? { ...x, pick: e.target.checked } : x)))} style={{ width: 18, height: 18, accentColor: "#8B5CF6" }} /></td>
            <td style={{ padding: "8px 12px", fontWeight: 700 }}>{l.name}<div style={{ fontWeight: 400, fontSize: 11.5, color: "#8A7AA8" }}>{l.address}{l.rating ? ` · ★ ${l.rating}` : ""}</div></td>
            <td style={{ padding: "8px 12px" }}>{l.website ? <a href={l.website} target="_blank" rel="noopener noreferrer" style={{ color: "#C4B5FD" }}>{l.website.replace(/^https?:\/\/(www\.)?/, "")}</a> : <span style={{ color: "#8A7AA8" }}>—</span>}</td>
            <td style={{ padding: "8px 12px" }}><input value={l.email} onChange={(e) => setLeads((c) => c.map((x, k) => (k === i ? { ...x, email: e.target.value.trim(), mx: true } : x)))} placeholder={l.checked ? "not found" : ""} style={{ ...inp, height: 32, width: 230, fontSize: 13 }} /></td>
            <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{l.phone || "—"}</td>
            <td style={{ padding: "8px 12px", fontSize: 12, whiteSpace: "nowrap" }}>{l.already ? "Already in Contacts" : !l.checked ? "—" : l.email && l.mx ? <span style={{ color: "#4ADE80" }}>✓ Email OK</span> : l.email ? <span style={{ color: "#FBBF24" }}>Can't verify</span> : <span style={{ color: "#F87171" }}>No email</span>}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
  );
}
