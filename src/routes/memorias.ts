import { Hono } from "hono";
import { db } from "../db/connection.js";
import { memorias, projectItems } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const memoriasRoutes = new Hono();
memoriasRoutes.use("*", authMiddleware);

// GET /api/project-items/:id/memoria
memoriasRoutes.get("/project-items/:id/memoria", async (c) => {
  const pItemId = c.req.param("id");
  const [row] = await db.select().from(memorias).where(eq(memorias.projectItemId, pItemId)).limit(1);
  return c.json(row || { projectItemId: pItemId, texto: "" });
});

// PUT /api/project-items/:id/memoria
memoriasRoutes.put("/project-items/:id/memoria", async (c) => {
  const pItemId = c.req.param("id");
  const { texto } = await c.req.json();

  const [pItem] = await db.select().from(projectItems).where(eq(projectItems.id, pItemId)).limit(1);
  if (!pItem) return c.json({ error: "Project Item not found" }, 404);

  const [existing] = await db.select().from(memorias).where(eq(memorias.projectItemId, pItemId)).limit(1);

  if (existing) {
    const [row] = await db.update(memorias)
      .set({ texto, updatedAt: new Date() })
      .where(eq(memorias.id, existing.id)).returning();
    return c.json(row);
  } else {
    const [row] = await db.insert(memorias)
      .values({
        projectId: pItem.projectId,
        projectItemId: pItemId,
        texto,
      }).returning();
    return c.json(row);
  }
});
