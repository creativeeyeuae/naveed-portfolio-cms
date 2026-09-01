import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const seo = new Hono<{ Bindings: Env }>();

seo.get("/:pagePath{.+}", async (c) => {
  const prisma = getPrismaClient(c.env);
  const record = await prisma.seoMetadata.findUnique({
    where: { pagePath: "/" + c.req.param("pagePath") },
  });
  return c.json(record ?? {});
});

seo.put("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = z.object({
    pagePath: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    ogImageUrl: z.string().url().optional(),
    jsonLd: z.unknown().optional(),
  }).parse(await c.req.json());

  const updated = await prisma.seoMetadata.upsert({
    where: { pagePath: body.pagePath },
    update: body as never,
    create: body as never,
  });
  return c.json(updated);
});
