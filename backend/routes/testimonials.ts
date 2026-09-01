import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const testimonials = new Hono<{ Bindings: Env }>();

const testimonialInput = z.object({
  clientName: z.string().min(1),
  quote: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  avatarUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

testimonials.get("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } });
  return c.json(list);
});

testimonials.post("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = testimonialInput.parse(await c.req.json());
  const created = await prisma.testimonial.create({ data: body });
  return c.json(created, 201);
});

testimonials.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = testimonialInput.partial().parse(await c.req.json());
  const updated = await prisma.testimonial.update({ where: { id: c.req.param("id") }, data: body });
  return c.json(updated);
});

testimonials.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  await prisma.testimonial.delete({ where: { id: c.req.param("id") } });
  return c.json({ success: true });
});
