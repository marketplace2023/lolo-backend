import { Hono } from "hono";
import { db } from "../db/connection.js";
import { equipments } from "../db/schema.js";
import { eq, ilike, or, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const equipmentsRoutes = new Hono();
equipmentsRoutes.use("*", authMiddleware);

equipmentsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query() as Record<string, string>);
  const where = search ? or(ilike(equipments.codigo, `%${search}%`), ilike(equipments.descripcion, `%${search}%`)) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(equipments).where(where);
  const rows = await db.select().from(equipments).where(where).orderBy(equipments.codigo).limit(limit).offset(offset);
  return c.json(paginate(rows, Number(total), page, limit));
});

equipmentsRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(equipments).where(eq(equipments.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

equipmentsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(equipments).values(body).returning();
  return c.json(row, 201);
});

equipmentsRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(equipments).set({ ...body, updatedAt: new Date() })
    .where(eq(equipments.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

equipmentsRoutes.delete("/:id", async (c) => {
  const [row] = await db.delete(equipments).where(eq(equipments.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
