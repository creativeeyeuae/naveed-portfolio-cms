// Handles the client portal + password-protected gallery flow.
import { Hono } from "hono";
import { z } from "zod";
import { getPrismaClient, type Env } from "../database/client";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const galleryAccess = new Hono<{ Bindings: Env }>();

// POST /gallery-access/unlock — public. Body: { albumId, password }
// Returns the album + media if the password matches, else 401.
galleryAccess.post("/unlock", async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = z.object({ albumId: z.string().uuid(), password: z.string() }).parse(
    await c.req.json()
  );

  const access = await prisma.galleryAccess.findFirst({
    where: { albumId: body.albumId, passwordHash: { not: null } },
  });
  if (!access?.passwordHash) return c.json({ error: "Gallery is not password protected" }, 404);

  // Compare using Web Crypto (SHA-256) since bcrypt isn't available in Workers by default.
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(body.password));
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (hashHex !== access.passwordHash) return c.json({ error: "Incorrect password" }, 401);
  if (access.expiresAt && access.expiresAt < new Date()) {
    return c.json({ error: "This gallery link has expired" }, 410);
  }

  const album = await prisma.album.findUnique({
    where: { id: body.albumId },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  return c.json({ album, allowDownload: access.allowDownload });
});

// GET /gallery-access/client/:clientId — logged-in client's assigned galleries
galleryAccess.get("/client/:clientId", requireAuth, async (c) => {
  const prisma = getPrismaClient(c.env);
  const list = await prisma.galleryAccess.findMany({
    where: { clientId: c.req.param("clientId") },
    include: { album: { include: { media: true } } },
  });
  return c.json(list);
});

// POST /gallery-access — admin only, grant access to a gallery
galleryAccess.post("/", requireAuth, requireAdmin, async (c) => {
  const prisma = getPrismaClient(c.env);
  const body = z.object({
    albumId: z.string().uuid(),
    clientId: z.string().uuid().optional(),
    password: z.string().optional(),
    allowDownload: z.boolean().optional(),
    expiresAt: z.string().optional(),
  }).parse(await c.req.json());

  let passwordHash: string | undefined;
  if (body.password) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(body.password));
    passwordHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const created = await prisma.galleryAccess.create({
    data: {
      albumId: body.albumId,
      clientId: body.clientId,
      passwordHash,
      allowDownload: body.allowDownload ?? true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    },
  });
  return c.json(created, 201);
});
