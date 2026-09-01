import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const contact = new Hono<{ Bindings: Env }>();

const contactInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(1),
});

// POST /contact — public
contact.post("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = contactInput.parse(await c.req.json());
  const created = await prisma.contactSubmission.create({ data: body });
  return c.json(created, 201);
});

// GET /contact — admin only
contact.get("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });
  return c.json(list);
});

// PATCH /contact/:id — mark as read
contact.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const updated = await prisma.contactSubmission.update({
    where: { id: c.req.param("id") },
    data: { isRead: true },
  });
  return c.json(updated);
});
