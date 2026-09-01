import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const analytics = new Hono<{ Bindings: Env }>();

// POST /analytics/track — public, fire-and-forget from the frontend
analytics.post("/track", async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = z.object({
    eventType: z.string().min(1),
    pagePath: z.string().optional(),
    metadata: z.unknown().optional(),
  }).parse(await c.req.json());

  await prisma.analyticsEvent.create({ data: body as never });
  return c.json({ success: true }, 201);
});

// GET /analytics/summary — admin only, basic counts for the dashboard
analytics.get("/summary", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const [pageViews, galleryViews, downloads, bookings] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: "page_view" } }),
    prisma.analyticsEvent.count({ where: { eventType: "gallery_view" } }),
    prisma.downloadLog.count(),
    prisma.booking.count(),
  ]);
  return c.json({ pageViews, galleryViews, downloads, bookings });
});
