import { Hono } from "hono";
import { mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { authMiddleware, JwtPayload } from "../middleware/auth.js";

export const uploadsRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

const UPLOADS_DIR = join(process.cwd(), "uploads");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function getExtension(file: File) {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

  return extname(file.name || "") || mimeToExt[file.type] || ".bin";
}

uploadsRoutes.use("*", authMiddleware);

uploadsRoutes.post("/image", async (c) => {
  const body = await c.req.parseBody();
  const uploaded = body.file;

  if (!(uploaded instanceof File)) {
    return c.json({ error: "No image file provided" }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(uploaded.type)) {
    return c.json({ error: "Unsupported image type" }, 400);
  }

  if (uploaded.size > 5 * 1024 * 1024) {
    return c.json({ error: "Image exceeds 5MB limit" }, 400);
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${getExtension(uploaded)}`;
  const filePath = join(UPLOADS_DIR, fileName);

  await Bun.write(filePath, uploaded);

  const origin = new URL(c.req.url).origin;
  return c.json({
    url: `${origin}/uploads/${fileName}`,
    fileName,
    size: uploaded.size,
    type: uploaded.type,
  }, 201);
});
