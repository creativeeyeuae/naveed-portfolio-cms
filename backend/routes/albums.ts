import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const albums = new Hono<{ Bindings: Env }>();

const albumInput = z.object({
  type: z.enum(["photography", "cinematography"]),
  categoryId: z.string().uuid().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// GET /albums?type=photography&featured=true — public, published only
albums.get("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const type = c.req.query("type");
  const featured = c.req.query("featured");

  const list = await prisma.album.findMany({
    where: {
      isPublished: true,
      ...(type ? { type: type as "photography" | "cinematography" } : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
    },
    include: { coverMedia: true, tags: { include: { tag: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return c.json(list);
});

// GET /albums/:slug — public single album with media
albums.get("/:slug", async (c) => {
  const prisma = getPrismaClient(c.env);
  const album = await prisma.album.findUnique({
    where: { slug: c.req.param("slug") },
    include: { media: { orderBy: { sortOrder: "asc" } }, tags: { include: { tag: true } } },
  });
  if (!album || !album.isPublished) return c.json({ error: "Not found" }, 404);
  return c.json(album);
});

// POST /albums — admin only
albums.post("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = albumInput.parse(await c.req.json());
  const created = await prisma.album.create({ data: body });
  return c.json(created, 201);
});

// PATCH /albums/:id — admin only
albums.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = albumInput.partial().parse(await c.req.json());
  const updated = await prisma.album.update({
    where: { id: c.req.param("id") },
    data: body,
  });
  return c.json(updated);
});

// DELETE /albums/:id — admin only
albums.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  await prisma.album.delete({ where: { id: c.req.param("id") } });
  return c.json({ success: true });
});
