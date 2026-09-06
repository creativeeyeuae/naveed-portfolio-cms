import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

// Maps onto the REAL, already-existing, already-populated `packages` table
// (see database/schema.prisma header). No migration creates this table.

export const packages = new Hono<{ Bindings: Env }>();

const packageInput = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number(),
  currency: z.string().optional(),
  duration: z.string().optional(),
  features: z.unknown().optional(),
  isFeatured: z.boolean().optional(),
  isSpecialOffer: z.boolean().optional(),
  discountPercentage: z.number().int().optional(),
  originalPrice: z.number().optional(),
  offerValidUntil: z.string().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET /packages — public, active only
packages.get("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  return c.json(list);
});

// GET /packages/all — admin only, includes inactive
packages.get("/all", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.package.findMany({ orderBy: { displayOrder: "asc" } });
  return c.json(list);
});

packages.post("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = packageInput.parse(await c.req.json());
  const created = await prisma.package.create({
    data: {
      ...body,
      offerValidUntil: body.offerValidUntil ? new Date(body.offerValidUntil) : undefined,
    } as never,
  });
  return c.json(created, 201);
});

packages.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = packageInput.partial().parse(await c.req.json());
  const updated = await prisma.package.update({
    where: { id: c.req.param("id") },
    data: {
      ...body,
      offerValidUntil: body.offerValidUntil ? new Date(body.offerValidUntil) : undefined,
    } as never,
  });
  return c.json(updated);
});

// Deliberately no DELETE here yet -- same reasoning as services.ts.
