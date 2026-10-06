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

type Env = VisitorEnv & PushEnv & { SUPABASE_SERVICE_ROLE_KEY: string; AI?: { run(model: string, input: unknown): Promise<any> } };
const MAX_LEN = 2000;
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

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
  try {
    const res = await supaAdmin(env as any, "site_settings?select=value&key=eq.nap_settings");
    if (!res.ok) return "";
    const rows = (await res.json()) as { value?: string }[];
    const settings = rows?.[0]?.value ? JSON.parse(rows[0].value) : null;
    if (!settings) return "";

    const services: any[] = Array.isArray(settings.services) ? settings.services : [];
    const packages: any[] = Array.isArray(settings.pricingPackages) ? settings.pricingPackages : [];
    const lines: string[] = [];
    if (settings.location) lines.push(`Location: ${settings.location} (UAE/GCC and internationally on request)`);
    if (services.length) {
      lines.push("Services offered:");
      for (const s of services) if (s?.title) lines.push(`- ${s.title}${s.desc ? `: ${s.desc}` : ""}`);
    }
    if (packages.length) {
      lines.push("Packages / pricing:");
      for (const p of packages) if (p?.label) lines.push(`- ${p.label}: ${p.price || "price on request"}${p.priceNote ? ` (${p.priceNote})` : ""}`);
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

const HANDOFF_YES = "[[HANDOFF:YES]]";
const HANDOFF_NO = "[[HANDOFF:NO]]";

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

  const insRes = await supaAdmin(env as any, "live_chat_messages", {
    method: "POST",
    body: JSON.stringify({ visitor_id: visitorId, sender: "visitor", body: text, is_read_by_admin: false, is_read_by_visitor: true }),
  });
  if (!insRes.ok) return json({ error: "Could not send your message.", detail: await insRes.text() }, 500, origin);
  const [visitorMsg] = (await insRes.json()) as any[];

  // Best-effort AI auto-reply -- never lets a hiccup here block the visitor's message from
  // having been saved (that already succeeded above).
  let aiReply: string | null = null;
  let needsHuman = false;
  try {
    const ai = await generateAiReply(env, visitorId, text);
    if (ai) {
      aiReply = ai.reply;
      needsHuman = ai.needsHuman;
      await supaAdmin(env as any, "live_chat_messages", {
        method: "POST",
        body: JSON.stringify({ visitor_id: visitorId, sender: "admin", is_ai: true, body: ai.reply, is_read_by_admin: true, is_read_by_visitor: false }),
      });
      if (needsHuman && visitorMsg?.id) {
        await supaAdmin(env as any, `live_chat_messages?id=eq.${visitorMsg.id}`, {
          method: "PATCH",
          body: JSON.stringify({ needs_human: true }),
        });
      }
    } else {
      needsHuman = true; // no AI reply at all -- make sure this still surfaces to Naveed
    }
  } catch {
    needsHuman = true;
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

  return json({ ok: true, aiReply, needsHuman }, 200, origin);
};
