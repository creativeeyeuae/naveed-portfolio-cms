import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

// Maps onto the REAL, already-existing, already-populated `services` table
// (see database/schema.prisma header). No migration creates this table.

export const services = new Hono<{ Bindings: Env }>();

const serviceInput = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  iconName: z.string().optional(),
  categoryFields: z.unknown().optional(),
  features: z.unknown().optional(),
  benefits: z.unknown().optional(),
  subservices: z.unknown().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// GET /services — public, active only
services.get("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  return c.json(list);
});

// GET /services/all — admin only, includes inactive
services.get("/all", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.service.findMany({ orderBy: { displayOrder: "asc" } });
  return c.json(list);
});

services.post("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = serviceInput.parse(await c.req.json());
  const created = await prisma.service.create({ data: body as never });
  return c.json(created, 201);
});

services.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = serviceInput.partial().parse(await c.req.json());
  const updated = await prisma.service.update({
    where: { id: c.req.param("id") },
    data: body as never,
  });
  return c.json(updated);
});

// Deliberately no DELETE here yet -- these rows are the site owner's real,
// already-seeded service catalog. Deactivate via isActive instead of
// deleting until the owner explicitly asks for delete support.
