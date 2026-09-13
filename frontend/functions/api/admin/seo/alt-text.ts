// POST /api/admin/seo/alt-text
//
// Generates real image alt text using Cloudflare Workers AI (env.AI -- see
// ../../../../wrangler.toml -- already available on this Cloudflare account,
// no new paid service introduced) by analyzing each real project image's
// actual pixel content with an image-captioning model. Never invents a
// description disconnected from the image: every value comes straight from
// the model looking at that exact file. Only ever fills in images that have
// NO alt text yet -- an admin-written value is never overwritten.
//
// Writes results back into the same nap_projects row in site_settings that
// CMS > Portfolio already reads/writes (see lib/cmsData.ts), using the
// existing service-role admin pattern (supaAdmin) every other function in
// this folder already uses. Every change is also logged to seo_change_log,
// the same audit trail the rest of the SEO Agent uses.
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

type Env = AdminEnv & { AI?: { run(model: string, input: unknown): Promise<any> } };

const MODEL = "@cf/llava-hf/llava-1.5-7b-hf";
const PROMPT =
  "Describe this photo in one concise, factual sentence suitable for an image alt attribute. Do not mention file names, watermarks, or that it is a photo.";

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (!env.AI) {
    return json({ error: "Workers AI is not bound to this project yet (check wrangler.toml + redeploy)." }, 500, origin);
  }

  const curRes = await supaAdmin(env, "site_settings?select=value&key=eq.nap_projects");
  if (!curRes.ok) return json({ error: "Could not load projects." }, 500, origin);
  const rows = (await curRes.json()) as { value?: string }[];
  const projects: any[] = rows?.[0]?.value ? JSON.parse(rows[0].value) : [];
  if (!Array.isArray(projects) || projects.length === 0) {
    return json({ updated: 0, results: [] }, 200, origin);
  }

  const results: { project: string; url: string; altText?: string; error?: string }[] = [];
  let updated = 0;

  for (const project of projects) {
    if (!Array.isArray(project.images)) continue;
    for (const img of project.images) {
      if (img.altText && String(img.altText).trim()) continue; // never overwrite an existing value
      try {
        const imgRes = await fetch(img.url);
        if (!imgRes.ok) { results.push({ project: project.slug, url: img.url, error: "Image fetch failed" }); continue; }
        const bytes = Array.from(new Uint8Array(await imgRes.arrayBuffer()));
        const out: any = await env.AI.run(MODEL, { image: bytes, prompt: PROMPT, max_tokens: 80 });
        const desc = String(out?.description || "").trim();
        if (!desc) { results.push({ project: project.slug, url: img.url, error: "Empty AI response" }); continue; }
        img.altText = desc;
        updated++;
        results.push({ project: project.slug, url: img.url, altText: desc });
      } catch (e: any) {
        results.push({ project: project.slug, url: img.url, error: e?.message || "AI generation failed" });
      }
    }
  }

  if (updated > 0) {
    const patchRes = await supaAdmin(env, "site_settings?key=eq.nap_projects", {
      method: "PATCH",
      body: JSON.stringify({ value: JSON.stringify(projects) }),
    });
    if (!patchRes.ok) {
      return json({ error: "Generated alt text but could not save it.", detail: await patchRes.text() }, 500, origin);
    }
    await supaAdmin(env, "seo_change_log", {
      method: "POST",
      body: JSON.stringify({
        issue_id: null,
        page_path: "nap_projects",
        field: "images[].altText",
        old_value: null,
        new_value: `${updated} image(s) auto-captioned via Workers AI`,
        applied_by: admin.email,
      }),
    });
  }

  return json({ updated, results }, 200, origin);
};
