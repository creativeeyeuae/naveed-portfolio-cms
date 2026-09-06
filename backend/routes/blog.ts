import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const blog = new Hono<{ Bindings: Env }>();

const postInput = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  coverMediaId: z.string().uuid().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

blog.get("/", async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.blogPost.findMany({
    where: { status: "published" },
    include: { coverMedia: true },
    orderBy: { publishedAt: "desc" },
  });
  return c.json(list);
});

blog.get("/:slug", async (c) => {
  const prisma = getPrismaClient(c.env);
  const post = await prisma.blogPost.findUnique({
    where: { slug: c.req.param("slug") },
    include: { coverMedia: true },
  });
  if (!post || post.status !== "published") return c.json({ error: "Not found" }, 404);
  return c.json(post);
});

blog.post("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = postInput.parse(await c.req.json());
  const created = await prisma.blogPost.create({
    data: {
      ...body,
      publishedAt: body.status === "published" ? new Date() : undefined,
    },
  });
  return c.json(created, 201);
});

blog.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = postInput.partial().parse(await c.req.json());
  const updated = await prisma.blogPost.update({ where: { id: c.req.param("id") }, data: body });
  return c.json(updated);
});
