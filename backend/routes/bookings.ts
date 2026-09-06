import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const bookings = new Hono<{ Bindings: Env }>();

const bookingInput = z.object({
  clientName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  serviceType: z.string().optional(),
  eventDate: z.string().optional(), // ISO date
  location: z.string().optional(),
  budget: z.string().optional(),
  message: z.string().optional(),
});

// POST /bookings — public (from the contact/booking form)
bookings.post("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = bookingInput.parse(await c.req.json());
  const created = await prisma.booking.create({
    data: {
      ...body,
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
    },
  });
  return c.json(created, 201);
});

// GET /bookings — admin only
bookings.get("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const status = c.req.query("status");
  const list = await prisma.booking.findMany({
    where: status ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
  });
  return c.json(list);
});

// PATCH /bookings/:id — admin only (status updates)
bookings.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = z.object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  }).parse(await c.req.json());
  const updated = await prisma.booking.update({
    where: { id: c.req.param("id") },
    data: body,
  });
  return c.json(updated);
});
