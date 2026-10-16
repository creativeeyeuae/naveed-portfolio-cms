// POST /api/cron/email-schedules -- called every 5 minutes by Supabase pg_cron (free), with
// the x-cron-secret header (token stored in public.cron_tokens). Each call works on ONE due
// schedule and sends a small chunk (CHUNK emails) of today's batch through the normal safe
// sender, so a batch of 50 goes out gradually over ~30 minutes instead of all at once --
// gentler on spam filters and well inside Cloudflare's per-request limits.
import { supaAdmin, json } from "../../_shared/adminAuth";
import { sendToOutreach, type Env } from "../../_shared/outreachSend";
import { nextRunAfterToday } from "../../_shared/emailSchedule";

const CHUNK = 8;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // The shared token lives only in the database (public.cron_tokens, service-role only) and
  // inside the pg_cron job that calls us -- see migration 0026.
  const given = request.headers.get("x-cron-secret") || "";
  const tr = given ? await supaAdmin(env, "cron_tokens?name=eq.email-schedules&select=token&limit=1", { method: "GET" }) : null;
  const token = tr && tr.ok ? ((await tr.json()) as any[])?.[0]?.token : null;
  if (!token || given.length < 32 || given !== token) return json({ error: "Forbidden" }, 403);
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return json({ error: "Email sending isn't set up." }, 503);

  const now = new Date();
  const due = await supaAdmin(env, `email_schedules?status=eq.active&next_run_at=lte.${now.toISOString()}&or=(locked_until.is.null,locked_until.lt.${now.toISOString()})&select=*&order=next_run_at.asc&limit=1`, { method: "GET" });
  const s = due.ok ? ((await due.json()) as any[])?.[0] : null;
  if (!s) return json({ ok: true, idle: true });

  const patch = (fields: Record<string, unknown>) =>
    supaAdmin(env, `email_schedules?id=eq.${s.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(fields) });
  await patch({ locked_until: new Date(now.getTime() + 4 * 60e3).toISOString() });

  try {
    const ids: string[] = s.company_ids || [];
    let campaignId: string | null = s.current_campaign_id;
    let nextIndex: number = s.next_index;

    // Start today's batch: a normal campaign for the next N companies (shows in Email history).
    if (!campaignId) {
      const slice = ids.slice(nextIndex, nextIndex + s.batch_size);
      if (!slice.length) { await patch({ status: "done", locked_until: null, last_note: "Finished -- every company in the list has been emailed." }); return json({ ok: true, done: true }); }
      const from = nextIndex + 1, to = nextIndex + slice.length;
      const cr = await supaAdmin(env, "email_campaigns", { method: "POST", body: JSON.stringify({ name: `${s.name} · rows ${from}–${to}`.slice(0, 140), template_id: s.template_id, category: "marketing", audience: { type: "outreach_companies", company_ids: slice }, created_by: "scheduler" }) });
      if (!cr.ok) throw new Error(`Could not create today's campaign: ${(await cr.text()).slice(0, 200)}`);
      campaignId = ((await cr.json()) as any[])?.[0]?.id;
      nextIndex += slice.length;
      await patch({ current_campaign_id: campaignId, next_index: nextIndex });
    }

    const cRes = await supaAdmin(env, `email_campaigns?id=eq.${campaignId}&select=*,email_templates(*)`, { method: "GET" });
    const campaign = cRes.ok ? ((await cRes.json()) as any[])?.[0] : null;
    if (!campaign?.email_templates) { await patch({ status: "paused", locked_until: null, last_note: "Paused: the email template was deleted." }); return json({ ok: false }); }

    const res = await sendToOutreach(env, campaign, campaign.email_templates, campaignId!, campaign.audience, "scheduler", null, { maxSend: CHUNK });
    const r = (await res.json()) as any;
    const sentCount = (s.sent_count || 0) + (r.sent || 0);
    const stamp = now.toISOString();

    if (r.paused === "chunk") {
      await patch({ sent_count: sentCount, last_run_at: stamp, locked_until: null, last_note: `Sending rows up to ${nextIndex}…` });
    } else if (r.paused === "daily_limit") {
      // The safe limit is a rolling 24 hours, so room frees up gradually -- try again in 30 min.
      await patch({ sent_count: sentCount, last_run_at: stamp, locked_until: null, next_run_at: new Date(now.getTime() + 30 * 60e3).toISOString(), last_note: "Waiting: daily safe sending limit reached -- continues automatically as room frees up." });
    } else if (r.paused === "too_many_failures") {
      await patch({ sent_count: sentCount, last_run_at: stamp, locked_until: null, status: "paused", last_note: "Paused automatically: too many emails failed. Check the list, then Resume." });
    } else {
      const finished = nextIndex >= ids.length;
      await patch({
        sent_count: sentCount, last_run_at: stamp, locked_until: null, current_campaign_id: null,
        batches_done: (s.batches_done || 0) + 1,
        ...(finished
          ? { status: "done", last_note: "Finished -- every company in the list has been emailed." }
          : { next_run_at: nextRunAfterToday(s.send_time, s.days).toISOString(), last_note: `Batch done (rows up to ${nextIndex}).` }),
      });
    }
    return json({ ok: true, schedule: s.id, sent: r.sent || 0, paused: r.paused || "" });
  } catch (e: any) {
    await patch({ locked_until: null, last_note: `Error: ${String(e?.message || e).slice(0, 300)}` });
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
};
