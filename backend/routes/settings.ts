import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const settings = new Hono<{ Bindings: Env }>();

settings.get("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.setting.findMany();
  const asObject = Object.fromEntries(list.map((s) => [s.key, s.value]));
  return c.json(asObject);
});

settings.put("/:key", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = z.object({ value: z.unknown() }).parse(await c.req.json());
  const updated = await prisma.setting.upsert({
    where: { key: c.req.param("key") },
    update: { value: body.value as never },
    create: { key: c.req.param("key"), value: body.value as never },
  });
  return c.json(updated);
});
