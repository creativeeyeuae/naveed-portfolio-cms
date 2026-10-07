// GET  /api/admin/chat-faqs -- list every saved chatbot Q&A entry (active + inactive).
// POST /api/admin/chat-faqs -- save a new one (question, answer).
//
// These are the Q&A pairs Naveed types in himself from the CMS "Chatbot Q&A" panel. The
// Live Chat AI (functions/api/visitor/chat.ts) reads every is_active=true row here and
// answers from it directly, same as it already does for services/pricing/location (see
// database/migrations/0016_chat_faqs.sql for why this is its own table).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../_shared/adminAuth";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestGet: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const res = await supaAdmin(env, "chat_faqs?select=*&order=sort_order.asc,created_at.asc&limit=500", { method: "GET" });
  if (!res.ok) return json({ error: "Could not load chatbot Q&A.", detail: await res.text() }, 500, origin);
  return json({ faqs: await res.json() }, 200, origin);
};

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { question?: string; answer?: string };
  const question = (body.question || "").trim();
  const answer = (body.answer || "").trim();
  if (!question || !answer) return json({ error: "A question and answer are both required." }, 400, origin);

  const res = await supaAdmin(env, "chat_faqs", {
    method: "POST",
    body: JSON.stringify({ question, answer }),
  });
  if (!res.ok) return json({ error: "Could not save that Q&A.", detail: await res.text() }, 500, origin);
  const rows = (await res.json()) as any[];
  return json({ faq: rows?.[0] }, 200, origin);
};
