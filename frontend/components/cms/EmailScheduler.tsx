"use client";
// CMS > Companies -- "Schedule emails": send a list gradually instead of all at once, e.g.
// Interior Design · 50 a day · 10:00 Dubai · Mon–Fri, until everyone has been emailed.
// The sending itself runs on the server (api/cron/email-schedules.ts, triggered free by
// Supabase pg_cron every 5 min) through the normal safe sender -- this tab can be closed.
import { useEffect, useMemo, useState } from "react";

type Starter = { key: string; name: string; subject: string; blocks: any[] };
const box = { background: "#1B1230", border: "1px solid rgba(139,92,246,0.45)", borderRadius: 12, padding: 16, display: "grid", gap: 12 } as const;
const btn = (pri = false) => ({ height: 36, borderRadius: 8, padding: "0 14px", font: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: pri ? "none" : "1px solid rgba(255,255,255,0.18)", background: pri ? "#8B5CF6" : "transparent", color: "#fff" }) as const;
const inp = { height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.16)", background: "#221640", color: "#F5F1FB", padding: "0 10px", font: "inherit", fontSize: 13, width: "100%", boxSizing: "border-box" } as const;
const lbl = { fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: "#A892C6", marginBottom: 4, display: "block" } as const;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dubaiToday(offsetDays = 0) {
  const d = new Date(Date.now() + 4 * 3600e3 + offsetDays * 86400e3);
  return d.toISOString().slice(0, 10);
}
// Lists the send days for a preview: [{date, from, to}]
function planDays(total: number, startRow: number, perDay: number, startDate: string, days: number[]) {
  const out: { date: string; from: number; to: number }[] = [];
  if (!days.length || perDay < 1) return out;
  let row = startRow; let d = new Date(startDate + "T00:00:00Z");
  for (let guard = 0; row <= total && guard < 800; guard++, d = new Date(d.getTime() + 86400e3)) {
    if (!days.includes(d.getUTCDay())) continue;
    const to = Math.min(total, row + perDay - 1);
    out.push({ date: d.toISOString().slice(0, 10), from: row, to });
    row = to + 1;
  }
  return out;
}
const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default function EmailScheduler({ token, companies, selected, filterLabel, starters }: {
  token: string; companies: any[]; selected: string[]; filterLabel: string; starters: Starter[];
}) {
  const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const [templates, setTemplates] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[] | null>(null);
  const [ready, setReady] = useState(true);
  const [cap, setCap] = useState(40);
  const [choice, setChoice] = useState("");
  const [startRow, setStartRow] = useState(1);
  const [perDay, setPerDay] = useState(50);
  const [startDate, setStartDate] = useState(dubaiToday(1));
  const [time, setTime] = useState("10:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => fetch("/api/admin/email-schedules", { headers: H }).then((r) => r.json()).then((d) => { setSchedules(d.schedules || []); setReady(d.ready !== false); if (d.daily_cap) setCap(d.daily_cap); }).catch(() => setSchedules([]));
  useEffect(() => {
    fetch("/api/admin/email/templates", { headers: H }).then((r) => r.json()).then((d) => setTemplates(d.templates || [])).catch(() => {});
    load();
    const t = setInterval(load, 60000); return () => clearInterval(t);
  }, []); // eslint-disable-line

  // Who: ticked companies if any, otherwise the current filtered list -- in the list's current
  // sort order -- keeping only companies that can actually receive an email.
  const list = useMemo(() => {
    const base = selected.length ? companies.filter((c) => selected.includes(c.id)) : companies;
    return base.filter((c) => c.email || (c.contact_count || 0) > 0);
  }, [companies, selected]);
  const who = selected.length ? `${selected.length} ticked companies` : filterLabel;
  const plan = useMemo(() => planDays(list.length, Math.max(1, startRow), perDay, startDate, days), [list.length, startRow, perDay, startDate, days]);
  const label = choice.startsWith("t:") ? templates.find((t) => "t:" + t.id === choice)?.name : starters.find((s) => "s:" + s.key === choice)?.name;

  async function templateIdFor(): Promise<string> {
    let id = choice.slice(2);
    if (!choice.startsWith("s:")) return id;
    const st = starters.find((s) => s.key === id)!;
    const existing = templates.find((t) => t.name === st.name);
    if (existing) return existing.id;
    const r = await fetch("/api/admin/email/templates", { method: "POST", headers: H, body: JSON.stringify({ name: st.name, subject: st.subject, blocks: st.blocks }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save the design");
    id = d.template?.id || d.id || d.templates?.[0]?.id; if (!id) throw new Error("Design saved -- pick it from My saved templates.");
    return id;
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const template_id = await templateIdFor();
      const body = { name: `${label} → ${who}`.slice(0, 140), template_id, company_ids: list.map((c) => c.id), start_row: startRow, batch_size: perDay, start_date: startDate, send_time: time, days, filter_label: who };
      const r = await fetch("/api/admin/email-schedules", { method: "POST", headers: H, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save");
      setMsg({ ok: true, text: `✓ Scheduled: ${plan.length} send day${plan.length === 1 ? "" : "s"}, first on ${plan[0] ? fmtDate(plan[0].date) : "—"} at ${time}. You can close this page -- it runs by itself.` });
      load();
    } catch (e: any) { setMsg({ ok: false, text: e.message || "Failed" }); }
    setBusy(false);
  }
  async function act(id: string, action: string) {
    const r = action === "delete"
      ? await fetch(`/api/admin/email-schedules/${id}`, { method: "DELETE", headers: H })
      : await fetch(`/api/admin/email-schedules/${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ action }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); }
    load();
  }

  if (!ready) return <div style={{ ...box, fontSize: 12.5, color: "#e0c060" }}>Scheduled sending needs a one-time database update (migration 0026).</div>;

  return (
    <div style={box}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>📅 Schedule emails <span style={{ fontWeight: 400, fontSize: 12, color: "#C4B5FD" }}>-- send a few every day instead of all at once (better for not landing in spam)</span></div>

      <div style={{ fontSize: 12.5, color: "#E2D9F3" }}>
        Sending to: <b>{who}</b> -- <b>{list.length}</b> with an email, in the list's current order.
        {selected.length ? null : <span style={{ color: "#A892C6" }}> (Pick a category chip / sort order above first, or tick companies.)</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={lbl}>Template</span>
          <select value={choice} onChange={(e) => setChoice(e.target.value)} style={inp}>
            <option value="">Choose what to send…</option>
            <optgroup label="Proposals & ready-made designs">{starters.map((s) => <option key={s.key} value={"s:" + s.key}>{s.name}</option>)}</optgroup>
            {templates.length > 0 && <optgroup label="My saved templates">{templates.map((t) => <option key={t.id} value={"t:" + t.id}>{t.name}</option>)}</optgroup>}
          </select>
        </div>
        <div><span style={lbl}>Start from row</span><input type="number" min={1} max={Math.max(1, list.length)} value={startRow} onChange={(e) => setStartRow(Math.max(1, Number(e.target.value) || 1))} style={inp} /></div>
        <div><span style={lbl}>Companies per day</span><input type="number" min={1} max={500} value={perDay} onChange={(e) => setPerDay(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} style={inp} /></div>
        <div><span style={lbl}>First day</span><input type="date" value={startDate} min={dubaiToday()} onChange={(e) => setStartDate(e.target.value)} style={inp} /></div>
        <div><span style={lbl}>Time (Dubai)</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inp} /></div>
      </div>

      <div>
        <span style={lbl}>Send on</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => { const on = days.includes(d); return (
            <button key={d} onClick={() => setDays((x) => on ? x.filter((y) => y !== d) : [...x, d])} style={{ ...btn(on), height: 30, padding: "0 12px", fontWeight: 600, background: on ? "rgba(139,92,246,0.35)" : "transparent", border: `1px solid ${on ? "#8B5CF6" : "rgba(255,255,255,0.18)"}` }}>{DAY[d]}</button>
          ); })}
        </div>
      </div>

      {plan.length > 0 && (
        <div style={{ fontSize: 12, color: "#C4B5FD", lineHeight: 1.6 }}>
          <b style={{ color: "#fff" }}>{plan.length} send day{plan.length === 1 ? "" : "s"}</b>: {plan.slice(0, 3).map((p) => `${fmtDate(p.date)} rows ${p.from}–${p.to}`).join(" · ")}{plan.length > 3 ? ` · … last ${fmtDate(plan[plan.length - 1].date)} rows ${plan[plan.length - 1].from}–${plan[plan.length - 1].to}` : ""}.
          {" "}Each day's batch goes out a few at a time over ~{Math.max(5, Math.ceil(perDay / 8) * 5)} minutes.
        </div>
      )}
      {perDay > cap && <div style={{ fontSize: 12, color: "#FCD34D" }}>⚠ Your daily safe limit is {cap} emails (Email settings). Days with more than {cap} will finish the rest later that day, as room frees up. The free Resend plan allows 100 emails a day.</div>}
      {perDay <= cap && perDay > 100 && <div style={{ fontSize: 12, color: "#FCD34D" }}>⚠ The free Resend plan allows 100 emails a day.</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={busy || !choice || !list.length || !days.length || startRow > list.length} onClick={save} style={btn(true)}>{busy ? "Saving…" : "Save schedule"}</button>
        {msg && <span style={{ fontSize: 12.5, color: msg.ok ? "#6EE7B7" : "#F87171" }}>{msg.text}</span>}
      </div>

      {schedules && schedules.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12, display: "grid", gap: 8 }}>
          <span style={lbl}>Your schedules</span>
          {schedules.map((s) => {
            const pct = s.total ? Math.round((Math.min(s.next_index, s.total) / s.total) * 100) : 0;
            const color = s.status === "active" ? "#6EE7B7" : s.status === "paused" ? "#FCD34D" : "#A892C6";
            return (
              <div key={s.id} style={{ padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <b style={{ fontSize: 13 }}>{s.name}</b>
                  <span style={{ fontSize: 11, color, textTransform: "capitalize" }}>● {s.status}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "#8B5CF6" }} /></div>
                <div style={{ fontSize: 11.5, color: "#C4B5FD" }}>
                  {Math.min(s.next_index, s.total)} of {s.total} companies reached · {s.sent_count} emails sent · {s.batch_size}/day at {s.send_time} ({(s.days || []).map((d: number) => DAY[d]).join(", ")})
                  {s.status === "active" ? ` · next: ${new Date(s.next_run_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                </div>
                {s.last_note && <div style={{ fontSize: 11, color: "#A892C6" }}>{s.last_note}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.status === "active" && <button onClick={() => act(s.id, "pause")} style={{ ...btn(), height: 28, fontSize: 11 }}>Pause</button>}
                  {s.status === "paused" && <button onClick={() => act(s.id, "resume")} style={{ ...btn(), height: 28, fontSize: 11 }}>Resume</button>}
                  {s.status !== "done" && <button onClick={() => act(s.id, "run_now")} style={{ ...btn(), height: 28, fontSize: 11 }}>Send next batch now</button>}
                  <button onClick={() => { if (confirm("Delete this schedule? Emails already sent are kept in the history.")) act(s.id, "delete"); }} style={{ ...btn(), height: 28, fontSize: 11, color: "#F87171" }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
