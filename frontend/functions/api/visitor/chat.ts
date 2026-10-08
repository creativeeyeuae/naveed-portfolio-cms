// GET  /api/visitor/chat   -- this browser's own live-chat thread (empty if never chatted)
// POST /api/visitor/chat   body: { body: string } -- send a message in that thread
//
// This is the on-site Live Chat widget's backend (FloatingWA in app/HomeClient.tsx) --
// the visitor stays on bynaveedanjum.com, nothing redirects to WhatsApp. Identity reuses
// the existing low-friction "visitor" session (no password; see _shared/visitorAuth.ts +
// api/visitor/identify.ts), already used for likes/comments, so anyone who has already
// identified themselves there is recognized here too with zero extra steps. Backed by the
// public.live_chat_messages table (database/migrations/0013_live_chat.sql, 0014_live_chat_
// ai.sql -- additive, not yet run against production; see those files' headers).
//
// AI auto-reply: every visitor message gets an instant answer from Cloudflare Workers AI
// (env.AI -- already bound in wrangler.toml, already used for image alt-text + business-
// card scanning, so this is NOT a new paid service). The reply is grounded only in the
// real services/packages/location already saved in the CMS (nap_settings) -- never invented
// pricing or availability. When the model can't fully answer (exact pricing/dates, a
// complaint, or the visitor asking for a person), that visitor message is flagged
// needs_human=true so the CMS can highlight it, and the admin push alert still fires either
// way (see notifyAllAdmins below).
import { supaAdmin, json, corsHeaders } from "../../_shared/adminAuth";
import { getVisitorIdFromRequest, type VisitorEnv } from "../../_shared/visitorAuth";
import { notifyAllAdmins, type PushEnv } from "../../_shared/webpush";
import { forwardLiveChatToWhatsApp } from "../../_shared/liveChatWhatsapp";

type Env = VisitorEnv & PushEnv & { SUPABASE_SERVICE_ROLE_KEY: string; AI?: { run(model: string, input: unknown): Promise<any> } };
const MAX_LEN = 2000;
// @cf/meta/llama-3.1-8b-instruct was deprecated by Cloudflare on 2026-05-30 -- every call to
// it has been throwing since then (confirmed live via `wrangler pages deployment tail`:
// "5028: @cf/meta/llama-3.1-8b-instruct was deprecated..."), which is why the AI never
// replied and every message silently fell back to needs_human. The -fast variant is the
// same model family, not deprecated, and returns the same { response: string } shape, so
// this is a same-provider drop-in swap -- no prompt/grounding/output-parsing changes needed.
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ messages: [] }, 200, origin);

  const res = await supaAdmin(env as any, `live_chat_messages?visitor_id=eq.${visitorId}&order=created_at.asc&limit=500`, {
    method: "GET",
  });
  if (!res.ok) return json({ messages: [] }, 200, origin);
  const rows = (await res.json()) as any[];

  // Mark admin's replies as read now that the visitor has fetched the thread.
  const unread = rows.filter((m) => m.sender === "admin" && !m.is_read_by_visitor).map((m) => m.id);
  if (unread.length) {
    await supaAdmin(env as any, `live_chat_messages?id=in.(${unread.join(",")})`, {
      method: "PATCH",
      body: JSON.stringify({ is_read_by_visitor: true }),
    });
  }

  return json({ messages: rows }, 200, origin);
};

// Builds the AI's grounding context from whatever is ACTUALLY saved in the CMS right now
// (nap_settings) -- services, packages/pricing, location. The model is told to only use
// this and never invent a number or a service that isn't here.
async function loadGroundingContext(env: Env): Promise<string> {
  const lines: string[] = [];

  try {
    const res = await supaAdmin(env as any, "site_settings?select=value&key=eq.nap_settings");
    if (res.ok) {
      const rows = (await res.json()) as { value?: string }[];
      const settings = rows?.[0]?.value ? JSON.parse(rows[0].value) : null;
      if (settings) {
        const services: any[] = Array.isArray(settings.services) ? settings.services : [];
        const packages: any[] = Array.isArray(settings.pricingPackages) ? settings.pricingPackages : [];
        if (settings.location) lines.push(`Location: ${settings.location} (UAE/GCC and internationally on request)`);
        if (services.length) {
          lines.push("Services offered:");
          for (const s of services) if (s?.title) lines.push(`- ${s.title}${s.desc ? `: ${s.desc}` : ""}`);
        }
        if (packages.length) {
          lines.push("Packages / pricing:");
          for (const p of packages) if (p?.label) lines.push(`- ${p.label}: ${p.price || "price on request"}${p.priceNote ? ` (${p.priceNote})` : ""}`);
        }
      }
    }
  } catch {}

  // Naveed's own saved Q&A (CMS "Chatbot Q&A" panel, database/migrations/0016_chat_faqs.sql).
  // These are his exact pre-written answers -- when a visitor asks something covered here,
  // the model should use this answer rather than guessing or deflecting to a handoff. Loaded
  // independently of nap_settings above, so FAQs still ground the AI even before Naveed has
  // filled in services/pricing.
  try {
    const faqRes = await supaAdmin(env as any, "chat_faqs?select=question,answer&is_active=eq.true&order=sort_order.asc&limit=200");
    if (faqRes.ok) {
      const faqs = (await faqRes.json()) as { question?: string; answer?: string }[];
      if (faqs.length) {
        lines.push("Frequently asked questions (Naveed's own answers -- use these exactly when they match):");
        for (const f of faqs) if (f?.question && f?.answer) lines.push(`Q: ${f.question}\nA: ${f.answer}`);
      }
    }
  } catch {}

  return lines.join("\n");
}

const HANDOFF_YES = "[[HANDOFF:YES]]";
const HANDOFF_NO = "[[HANDOFF:NO]]";
// Shown to the visitor whenever the AI can't produce any reply at all -- most commonly
// because Cloudflare's free daily Workers AI allowance (10,000 Neurons/day) has been used
// up for the day, but this also covers any other failure (model deprecated/renamed again, a
// network blip, a Supabase hiccup, etc). Never leave the visitor staring at silence, and
// never invent an answer either -- same honest "a person will follow up" tone the model
// itself already uses when IT decides a human is needed (see HANDOFF_YES above). Nothing is
// needed to "resume" normal AI replies once the free allowance is back -- Cloudflare resets
// it automatically every day at 00:00 UTC, so the next visitor message after that just gets
// a normal AI reply again on its own.
const AI_FALLBACK_REPLY = "Thanks for your message! I'm stepping in personally and will get back to you very shortly.";

// AI-initiated WhatsApp handover -- a SEPARATE, additional option alongside the EXISTING
// manual Take Over control in the CMS (api/admin/livechat.ts's ai_paused toggle, untouched
// by any of this). When the AI itself decides a human may be needed, the visitor is shown
// this EXACT fixed question (not the model's own free-text wording) with two choices,
// rendered as buttons by HomeClient.tsx's FloatingWA widget:
//   "Connect with Naveed on WhatsApp"  -> sends WA_HANDOVER_SENTINEL back to this endpoint,
//                                         handled right at the top of onRequestPost below.
//   "I have another question"         -> handled entirely client-side (dismiss + keep
//                                         chatting); nothing is sent to this endpoint at all.
// Deliberately NOT a real WhatsApp send of any kind: no message to Naveed's own number, no
// self-chat message from the QR-connected bridge account, no simulated incoming message from
// the client. It only flags the thread (reusing the existing needs_human column) and shows a
// plain wa.me link in the CMS so Naveed can start a completely normal WhatsApp conversation
// himself, from his own phone, same as he would with anyone else.
const WA_HANDOVER_PROMPT = "Would you like to continue with Naveed on WhatsApp, or do you have any other questions I can help you with?";
const WA_HANDOVER_SENTINEL = "__WA_HANDOVER__";
const WA_HANDOVER_CONFIRM = "Sure. Naveed will connect with you shortly on WhatsApp. Please keep your WhatsApp available.";

// Asks Workers AI for a reply, grounded only in loadGroundingContext()'s real data, plus the
// last few turns of this same thread for continuity. The model is required to end its reply
// with a HANDOFF marker (stripped before display) saying whether Naveed should personally
// follow up -- e.g. exact pricing for a specific date, a custom quote, a complaint, or the
// visitor directly asking for a person. If the marker is missing or the call fails, this
// defaults to "needs human" (false negatives here mean a real lead gets missed -- never risk
// that just to let the bot look more autonomous).
async function generateAiReply(env: Env, visitorId: string, latestText: string): Promise<{ reply: string; needsHuman: boolean } | null> {
  if (!env.AI) return null;
  const grounding = await loadGroundingContext(env);

  let history: any[] = [];
  try {
    const histRes = await supaAdmin(env as any, `live_chat_messages?visitor_id=eq.${visitorId}&order=created_at.desc&limit=8`);
    if (histRes.ok) history = ((await histRes.json()) as any[]).reverse();
  } catch {}

  const system = `You are a helpful assistant answering on-site live chat for Naveed Anjum, a professional photographer and cinematographer in Dubai. Be warm, brief (2-4 sentences), and only use the facts below -- never invent a price, date, or service that isn't listed. If the visitor asks something specific you can't confidently answer from these facts (an exact quote for their situation, checking a specific date's availability, a complaint, or they ask to speak to a real person), say Naveed will personally follow up shortly, and still end with the handoff marker below.

FACTS (the only source of truth -- do not go beyond these):
${grounding || "(no services/pricing saved yet -- defer to Naveed for anything specific)"}

When it naturally helps the visitor decide what to do next (for example right after describing services or pricing), end your answer -- before the handoff marker -- with 2 to 3 short next-step options as a numbered list, each on its own line, like:
1. See our packages & pricing
2. Book a session
3. Ask something else
Keep each option under 6 words and only offer options that are genuinely useful next steps; skip the list entirely for a short factual answer where it wouldn't add anything.

End EVERY reply with exactly one of these two lines, on its own line, nothing after it:
${HANDOFF_YES}  <- if Naveed should personally follow up on this
${HANDOFF_NO}   <- if your answer above fully covers it`;

  const messages = [
    { role: "system", content: system },
    ...history.filter((m) => m.id).map((m: any) => ({ role: m.sender === "admin" ? "assistant" : "user", content: String(m.body || "").replace(HANDOFF_YES, "").replace(HANDOFF_NO, "").trim() })),
    { role: "user", content: latestText },
  ];

  try {
    const out: any = await env.AI.run(AI_MODEL, { messages, max_tokens: 300 });
    const raw = String(out?.response || "").trim();
    if (!raw) return null;
    const needsHuman = !raw.includes(HANDOFF_NO); // missing/garbled marker -> default to needing a human
    const reply = raw.replace(HANDOFF_YES, "").replace(HANDOFF_NO, "").trim();
    if (!reply) return null;
    return { reply, needsHuman };
  } catch {
    return null;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const visitorId = await getVisitorIdFromRequest(request, env);
  if (!visitorId) return json({ error: "Please share your name and WhatsApp number first.", needsIdentity: true }, 401, origin);

  const body = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body.body || "").trim();
  if (!text) return json({ error: "Message can't be empty." }, 400, origin);
  if (text.length > MAX_LEN) return json({ error: "Message is too long." }, 400, origin);

  // The visitor's answer to the AI-initiated WhatsApp handover prompt (see WA_HANDOVER_PROMPT
  // above) -- never typed by the visitor themselves, only ever sent by the "Connect with
  // Naveed on WhatsApp" button under that exact message (HomeClient.tsx's FloatingWA).
  const isWaHandoverChoice = text === WA_HANDOVER_SENTINEL;

  const insRes = await supaAdmin(env as any, "live_chat_messages", {
    method: "POST",
    body: JSON.stringify({ visitor_id: visitorId, sender: "visitor", body: isWaHandoverChoice ? "Connect with Naveed on WhatsApp" : text, is_read_by_admin: false, is_read_by_visitor: true }),
  });
  if (!insRes.ok) return json({ error: "Could not send your message.", detail: await insRes.text() }, 500, origin);
  const [visitorMsg] = (await insRes.json()) as any[];

  // ── AI-initiated WhatsApp handover request. This is a REQUEST, not an automated WhatsApp
  // send of any kind: no message to Naveed's own number, no self-chat message from the
  // QR-connected bridge account, no simulated incoming message from the client. It only
  // flags this thread (reusing the existing needs_human column, same mechanism as any other
  // handoff) and notifies the CMS. Naveed then opens a completely normal WhatsApp chat
  // himself from his own phone (the new "Open WhatsApp" wa.me link in the CMS Live Chat
  // panel). The EXISTING manual Take Over control is untouched and keeps working exactly as
  // before, independently of this. ────────────────────────────────────────────────────────
  if (isWaHandoverChoice) {
    if (visitorMsg?.id) {
      try {
        await supaAdmin(env as any, `live_chat_messages?id=eq.${visitorMsg.id}`, {
          method: "PATCH",
          body: JSON.stringify({ needs_human: true }),
        });
      } catch {}
    }
    try {
      await supaAdmin(env as any, "live_chat_messages", {
        method: "POST",
        body: JSON.stringify({ visitor_id: visitorId, sender: "admin", is_ai: true, body: WA_HANDOVER_CONFIRM, is_read_by_admin: true, is_read_by_visitor: false }),
      });
    } catch {}
    try {
      await notifyAllAdmins(env, {
        title: "WhatsApp handover requested",
        body: "A live chat visitor asked to continue on WhatsApp.",
        url: "/?admin=1",
      });
    } catch {}
    // Deliberately no forwardLiveChatToWhatsApp call here -- per spec, this exact flow must
    // never message Naveed's own WhatsApp number or create a bridge self-chat message. The
    // CMS notification above is the only alert for this path.
    return json({ ok: true, aiReply: WA_HANDOVER_CONFIRM, needsHuman: true }, 200, origin);
  }

  // Has Naveed personally taken over this visitor's thread? (toggled from the CMS Live Chat
  // panel, see api/admin/livechat.ts). If so, skip the AI entirely -- only his own replies
  // should land until he resumes it.
  let aiPaused = false;
  try {
    const vRes = await supaAdmin(env as any, `visitors?id=eq.${visitorId}&select=ai_paused&limit=1`);
    if (vRes.ok) aiPaused = Boolean(((await vRes.json()) as any[])?.[0]?.ai_paused);
  } catch {}

  // Best-effort AI auto-reply -- never lets a hiccup here block the visitor's message from
  // having been saved (that already succeeded above).
  let aiReply: string | null = null;
  let needsHuman = aiPaused;
  if (!aiPaused) {
    try {
      const ai = await generateAiReply(env, visitorId, text);
      if (ai) {
        if (ai.needsHuman) {
          // The AI decided a human may be needed. Show the visitor the fixed two-choice
          // prompt instead of the model's own free-text wording. This does NOT trigger the
          // dedicated WhatsApp-handover CMS notification/flow above (that stays opt-in --
          // only "Connect with Naveed on WhatsApp" does that, handled near the top of this
          // function), but it DOES flag needs_human here, same as it always did before this
          // feature existed, so Naveed's existing "Live chat needs you" push + CMS highlight
          // still fire right away -- a visitor who picks "I have another question" (handled
          // entirely client-side) or simply abandons the chat is still a visible, flagged
          // lead, never a silent miss.
          needsHuman = true;
          aiReply = WA_HANDOVER_PROMPT;
          await supaAdmin(env as any, "live_chat_messages", {
            method: "POST",
            body: JSON.stringify({ visitor_id: visitorId, sender: "admin", is_ai: true, body: WA_HANDOVER_PROMPT, is_read_by_admin: true, is_read_by_visitor: false }),
          });
        } else {
          aiReply = ai.reply;
          await supaAdmin(env as any, "live_chat_messages", {
            method: "POST",
            body: JSON.stringify({ visitor_id: visitorId, sender: "admin", is_ai: true, body: ai.reply, is_read_by_admin: true, is_read_by_visitor: false }),
          });
        }
      } else {
        // No AI reply at all -- most commonly the free daily Workers AI allowance is used
        // up for today (see AI_FALLBACK_REPLY above). Send the honest holding reply instead
        // of leaving the visitor with silence; this self-corrects automatically once
        // Cloudflare's free allowance resets, with no further action needed here.
        needsHuman = true;
        aiReply = AI_FALLBACK_REPLY;
        try {
          await supaAdmin(env as any, "live_chat_messages", {
            method: "POST",
            body: JSON.stringify({ visitor_id: visitorId, sender: "admin", is_ai: true, body: AI_FALLBACK_REPLY, is_read_by_admin: true, is_read_by_visitor: false }),
          });
        } catch {}
      }
      if (needsHuman && visitorMsg?.id) {
        try {
          await supaAdmin(env as any, `live_chat_messages?id=eq.${visitorMsg.id}`, {
            method: "PATCH",
            body: JSON.stringify({ needs_human: true }),
          });
        } catch {}
      }
    } catch {
      // Something failed outside generateAiReply's own error handling (e.g. the Supabase
      // write itself). Same honest fallback, best-effort -- the visitor's original message
      // was already safely saved above regardless of anything that happens here.
      needsHuman = true;
      aiReply = AI_FALLBACK_REPLY;
      try {
        await supaAdmin(env as any, "live_chat_messages", {
          method: "POST",
          body: JSON.stringify({ visitor_id: visitorId, sender: "admin", is_ai: true, body: AI_FALLBACK_REPLY, is_read_by_admin: true, is_read_by_visitor: false }),
        });
      } catch {}
      if (visitorMsg?.id) {
        try {
          await supaAdmin(env as any, `live_chat_messages?id=eq.${visitorMsg.id}`, {
            method: "PATCH",
            body: JSON.stringify({ needs_human: true }),
          });
        } catch {}
      }
    }
  } else if (visitorMsg?.id) {
    // Thread is taken over -- still flag the message so the CMS highlights it the same way.
    try {
      await supaAdmin(env as any, `live_chat_messages?id=eq.${visitorMsg.id}`, {
        method: "PATCH",
        body: JSON.stringify({ needs_human: true }),
      });
    } catch {}
  }

  try {
    await notifyAllAdmins(env, {
      title: needsHuman ? "Live chat needs you" : "New live chat message",
      body: text.slice(0, 120),
      url: "/?admin=1",
    });
  } catch {
    // Push is best-effort -- the message itself is already saved either way.
  }

  // Forward to Naveed's own WhatsApp too, so he's notified even away from the CMS/browser --
  // reuses the existing WhatsApp bridge, see _shared/liveChatWhatsapp.ts. Tagged with this
  // visitor's short code so he can reply straight from WhatsApp and have it land back in
  // this exact thread (see whatsapp-bridge/index.js + handleAdminReplyIn in webhook.ts).
  try {
    await forwardLiveChatToWhatsApp(env, visitorId, `💬 Live Chat${needsHuman ? " (needs you)" : ""}:\n${text.slice(0, 300)}`);
  } catch {}

  return json({ ok: true, aiReply, needsHuman }, 200, origin);
};
