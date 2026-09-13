// POST /api/admin/seo/run
//
// The real crawler + audit engine for the SEO Agent (Phase 1). Requires a real admin
// session (see _shared/adminAuth.ts) -- this is the only entry point that starts a run.
//
// What it actually does, honestly:
//   1. Fetches the site's OWN real sitemap.xml (bynaveedanjum.com/sitemap.xml, generated
//      by app/sitemap.ts from real Album/BlogPost data) -- so it audits exactly the real,
//      indexable pages, not a hand-typed URL list.
//   2. Fetches each real page's real HTML (server-side, so no CORS issue) and parses it
//      with Cloudflare's own HTMLRewriter -- a real streaming HTML parser, not string
//      guessing -- to check title, meta description, canonical, Open Graph tags, H1s,
//      image alt text, structured data (JSON-LD), viewport tag, and word count.
//   3. Turns what it actually found into scored findings and stores them for the CMS's
//      SEO Agent dashboard to display.
//
// Nothing here invents data: every number comes from an actual fetch of an actual page,
// just made from this run. There is no auto-fix step yet -- Phase 1 is detection +
// tracking only (see seo_issues.auto_fixable, which this file always sets to false).
import { requireAdmin, supaAdmin, json, corsHeaders, type AdminEnv } from "../../../_shared/adminAuth";

const SITE_URL = "https://bynaveedanjum.com";
// Safety cap so one run can never hang or hammer the live site -- generous enough to
// cover the whole real sitemap today, revisit if the site grows past this many pages.
const MAX_PAGES = 60;

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });

type PageFindings = {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1Count: number;
  imgTotal: number;
  imgMissingAlt: number;
  jsonLdCount: number;
  robotsMeta: string | null;
  viewportMeta: string | null;
  wordCount: number;
};

async function analyzePage(url: string): Promise<{ status: number; findings: PageFindings }> {
  const res = await fetch(url, { redirect: "follow" });
  const status = res.status;
  const findings: PageFindings = {
    title: null, metaDescription: null, canonical: null,
    ogTitle: null, ogDescription: null, ogImage: null,
    h1Count: 0, imgTotal: 0, imgMissingAlt: 0, jsonLdCount: 0,
    robotsMeta: null, viewportMeta: null, wordCount: 0,
  };
  let titleBuf = "";
  let bodyWordBuf = "";

  const rewriter = new HTMLRewriter()
    .on("title", { text(t) { titleBuf += t.text; if (t.lastInTextNode) findings.title = titleBuf.trim(); } })
    .on('meta[name="description"]', { element(el) { findings.metaDescription = el.getAttribute("content"); } })
    .on('link[rel="canonical"]', { element(el) { findings.canonical = el.getAttribute("href"); } })
    .on('meta[property="og:title"]', { element(el) { findings.ogTitle = el.getAttribute("content"); } })
    .on('meta[property="og:description"]', { element(el) { findings.ogDescription = el.getAttribute("content"); } })
    .on('meta[property="og:image"]', { element(el) { findings.ogImage = el.getAttribute("content"); } })
    .on('meta[name="robots"]', { element(el) { findings.robotsMeta = el.getAttribute("content"); } })
    .on('meta[name="viewport"]', { element(el) { findings.viewportMeta = el.getAttribute("content"); } })
    .on("h1", { element() { findings.h1Count++; } })
    .on("img", {
      element(el) {
        findings.imgTotal++;
        const alt = el.getAttribute("alt");
        if (alt === null || alt.trim() === "") findings.imgMissingAlt++;
      },
    })
    .on('script[type="application/ld+json"]', { element() { findings.jsonLdCount++; } })
    .on("body", { text(t) { bodyWordBuf += t.text; } });

  await rewriter.transform(res).arrayBuffer();
  findings.wordCount = bodyWordBuf.trim().split(/\s+/).filter(Boolean).length;
  return { status, findings };
}

type Issue = {
  page_path: string; page_url: string; category: string; severity: string;
  title: string; description: string; recommendation: string | null;
  current_value: string | null; recommended_value: string | null;
};

const CATEGORIES = [
  "Titles", "Meta Descriptions", "Headings", "Images", "Canonical Tags",
  "Open Graph / Social", "Structured Data", "Mobile Viewport", "Content Depth",
] as const;

// Turns one page's real findings into zero or more real issues. Every check here is
// derived straight from the HTML this run just fetched -- nothing is guessed or invented.
function auditOne(path: string, url: string, status: number, f: PageFindings): Issue[] {
  const out: Issue[] = [];
  const add = (category: string, severity: string, title: string, description: string, recommendation: string | null, current: string | null, recommended: string | null) =>
    out.push({ page_path: path, page_url: url, category, severity, title, description, recommendation, current_value: current, recommended_value: recommended });

  if (status >= 400) {
    add("Titles", "critical", "Page returns an error", `This page responded with HTTP ${status} instead of 200.`, "Fix the broken route or remove it from the sitemap.", String(status), "200");
    return out; // nothing else is meaningful to check on a broken page
  }

  if (!f.title) add("Titles", "critical", "Missing <title> tag", "Search engines and browser tabs have nothing to show for this page's title.", "Add a real, descriptive title (ideally 15-60 characters).", null, "15-60 characters");
  else if (f.title.length < 15 || f.title.length > 65) add("Titles", "medium", "Title length not optimal", `The title is ${f.title.length} characters. Titles outside ~15-60 characters often get cut off or under-describe the page in search results.`, "Aim for 15-60 characters.", `${f.title.length} chars: "${f.title}"`, "15-60 characters");

  if (!f.metaDescription) add("Meta Descriptions", "high", "Missing meta description", "Search engines will auto-generate a snippet instead of using your own wording, which usually hurts click-through rate.", "Add a real meta description (ideally 50-160 characters).", null, "50-160 characters");
  else if (f.metaDescription.length < 50 || f.metaDescription.length > 160) add("Meta Descriptions", "medium", "Meta description length not optimal", `The description is ${f.metaDescription.length} characters. Outside ~50-160 characters it's often truncated or too thin in search results.`, "Aim for 50-160 characters.", `${f.metaDescription.length} chars`, "50-160 characters");

  if (f.h1Count === 0) add("Headings", "high", "Missing H1 heading", "There is no H1 on this page, which weakens the page's topical signal to search engines.", "Add exactly one H1 that describes the page's main topic.", "0", "1");
  else if (f.h1Count > 1) add("Headings", "low", `${f.h1Count} H1 headings found`, "Multiple H1s can dilute the page's main topical signal.", "Use a single H1; demote the rest to H2/H3.", String(f.h1Count), "1");

  if (f.imgTotal > 0 && f.imgMissingAlt > 0) add("Images", "medium", `${f.imgMissingAlt} of ${f.imgTotal} images missing alt text`, "Images without alt text are invisible to screen readers and to Google Image Search.", "Add descriptive alt text to every real image (not decorative ones).", `${f.imgMissingAlt} missing`, "0 missing");

  if (!f.canonical) add("Canonical Tags", "medium", "Missing canonical tag", "Without a canonical tag, search engines have to guess the preferred URL for this content.", "Add a self-referencing canonical link tag.", null, "present");

  const missingOg = [!f.ogTitle && "og:title", !f.ogDescription && "og:description", !f.ogImage && "og:image"].filter(Boolean) as string[];
  if (missingOg.length) add("Open Graph / Social", "low", `Incomplete Open Graph tags (${missingOg.join(", ")})`, "Missing Open Graph tags mean links to this page look blank/generic when shared on social media or messaging apps.", `Add: ${missingOg.join(", ")}.`, missingOg.join(", ") + " missing", "all og: tags present");

  if (f.jsonLdCount === 0) add("Structured Data", "low", "No structured data (JSON-LD) found", "Structured data helps search engines understand and richly display this content (e.g. rich results).", "Add appropriate JSON-LD (Organization, CreativeWork, Article, etc.).", "0 scripts", "1+ scripts");

  if (f.robotsMeta && /noindex/i.test(f.robotsMeta)) add("Titles", "critical", "Page is set to noindex", "This page is listed in the sitemap but its own robots meta tag tells search engines not to index it -- a direct contradiction.", "Remove noindex from this page, or remove it from the sitemap if it's meant to stay unindexed.", f.robotsMeta, "index, follow");

  if (!f.viewportMeta) add("Mobile Viewport", "high", "Missing responsive viewport meta tag", "Without a viewport tag, mobile browsers may render this page at desktop width, hurting mobile usability and rankings.", 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', null, "width=device-width, initial-scale=1");

  if (f.wordCount > 0 && f.wordCount < 150) add("Content Depth", "opportunity", `Thin content (${f.wordCount} words)`, "Pages with very little real text tend to rank worse and give search engines little to understand the page by.", "Consider expanding with more real, relevant copy.", `${f.wordCount} words`, "150+ words");

  return out;
}

// Real, deterministic scoring: each category starts at 100 and loses points for every
// real issue found in it, scaled by severity and by how many pages were actually
// checked (so one bad page on a 5-page site hurts more than one bad page on a 50-page
// site). Never fabricated -- purely a function of the issues this run just recorded.
const SEVERITY_WEIGHT: Record<string, number> = { critical: 30, high: 18, medium: 9, low: 4, opportunity: 2 };

function scoreByCategory(issues: Issue[], pages: number): Record<string, number> {
  const penalty: Record<string, number> = {};
  for (const cat of CATEGORIES) penalty[cat] = 0;
  for (const iss of issues) {
    const w = SEVERITY_WEIGHT[iss.severity] ?? 5;
    penalty[iss.category] = (penalty[iss.category] || 0) + w;
  }
  const out: Record<string, number> = {};
  const perPageScale = Math.max(pages, 1);
  for (const cat of CATEGORIES) {
    const raw = 100 - Math.round((penalty[cat] / perPageScale) * 10);
    out[cat] = Math.max(0, Math.min(100, raw));
  }
  return out;
}

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  const origin = request.headers.get("Origin");
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  // 1) Insert a "running" audit row up front so the dashboard can show progress/failure
  //    even if the crawl itself throws partway through.
  const createRes = await supaAdmin(env, "seo_audits", {
    method: "POST",
    body: JSON.stringify({ status: "running", triggered_by: admin.email }),
  });
  if (!createRes.ok) return json({ error: "Could not start audit run.", detail: await createRes.text() }, 500, origin);
  const [auditRow] = (await createRes.json()) as any[];
  const auditId = auditRow.id;

  try {
    // 2) Fetch the site's own real sitemap.
    const sitemapRes = await fetch(`${SITE_URL}/sitemap.xml`);
    if (!sitemapRes.ok) throw new Error(`Could not fetch sitemap.xml (HTTP ${sitemapRes.status})`);
    const sitemapXml = await sitemapRes.text();
    const urls = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).slice(0, MAX_PAGES);
    if (urls.length === 0) throw new Error("Sitemap contained no URLs.");

    // 3) Crawl + audit every real page, sequentially (gentle on the live site).
    const allIssues: Issue[] = [];
    let pagesCrawled = 0;
    for (const url of urls) {
      let path = "/";
      try { path = new URL(url).pathname || "/"; } catch { /* keep default */ }
      try {
        const { status, findings } = await analyzePage(url);
        allIssues.push(...auditOne(path, url, status, findings));
        pagesCrawled++;
      } catch (e: any) {
        allIssues.push({
          page_path: path, page_url: url, category: "Titles", severity: "critical",
          title: "Page could not be fetched", description: e?.message || "Fetch failed.",
          recommendation: "Check that the page is reachable.", current_value: null, recommended_value: null,
        });
      }
    }

    const scores = scoreByCategory(allIssues, pagesCrawled);

    // 4) Store every real finding (bulk insert), then close out the audit row.
    if (allIssues.length) {
      const insertRes = await supaAdmin(env, "seo_issues", {
        method: "POST",
        body: JSON.stringify(allIssues.map((i) => ({ ...i, audit_id: auditId, auto_fixable: false }))),
      });
      if (!insertRes.ok) throw new Error(`Could not save findings: ${await insertRes.text()}`);
    }

    await supaAdmin(env, `seo_audits?id=eq.${auditId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed", finished_at: new Date().toISOString(),
        pages_crawled: pagesCrawled, total_issues: allIssues.length, score_by_category: scores,
      }),
    });

    return json({ auditId, pagesCrawled, totalIssues: allIssues.length, scoreByCategory: scores }, 200, origin);
  } catch (e: any) {
    await supaAdmin(env, `seo_audits?id=eq.${auditId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", finished_at: new Date().toISOString(), error: e?.message || "Unknown error" }),
    });
    return json({ error: "SEO audit run failed.", detail: e?.message || String(e) }, 500, origin);
  }
};
