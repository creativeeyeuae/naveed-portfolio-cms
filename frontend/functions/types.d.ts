// Minimal local ambient types for Cloudflare Pages Functions, so this folder compiles
// standalone without adding the @cloudflare/workers-types dependency to the Next.js app.
// (These functions are bundled by Wrangler at deploy time, not by Next's own build --
// see tsconfig.json's "exclude", which keeps this folder out of `next build`'s type-check.)
type PagesFunctionContext<Env = unknown> = {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
};
type PagesFunction<Env = unknown> = (
  ctx: PagesFunctionContext<Env>
) => Response | Promise<Response>;

// Cloudflare's own streaming HTML parser -- a real runtime global on Workers/Pages
// Functions (used by the SEO Agent crawler, api/admin/seo/run.ts). Minimal shape only,
// same "ambient, not the full workers-types package" approach as the rest of this file.
declare class HTMLRewriter {
  on(
    selector: string,
    handlers: {
      element?(el: { getAttribute(name: string): string | null }): void;
      text?(chunk: { text: string; lastInTextNode: boolean }): void;
    }
  ): HTMLRewriter;
  transform(response: Response): Response;
}
