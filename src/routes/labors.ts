import { Hono } from "hono";
import { db } from "../db/connection.js";
import { labors } from "../db/schema.js";
import { eq, ilike, or, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const laborsRoutes = new Hono();
laborsRoutes.use("*", authMiddleware);

laborsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query() as Record<string, string>);
  const where = search ? or(ilike(labors.codigo, `%${search}%`), ilike(labors.descripcion, `%${search}%`)) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(labors).where(where);
  const rows = await db.select().from(labors).where(where).orderBy(labors.codigo).limit(limit).offset(offset);
  return c.json(paginate(rows, Number(total), page, limit));
});

laborsRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(labors).where(eq(labors.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

laborsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(labors).values(body).returning();
  return c.json(row, 201);
});

laborsRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(labors).set({ ...body, updatedAt: new Date() })
    .where(eq(labors.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

laborsRoutes.delete("/:id", async (c) => {
  const [row] = await db.delete(labors).where(eq(labors.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
