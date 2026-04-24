import { Hono } from "hono";
import { db } from "../db/connection.js";
import { familiesBcv } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const familiesRoutes = new Hono();
familiesRoutes.use("*", authMiddleware);

familiesRoutes.get("/", async (c) => {
  const tipo = c.req.query("tipo");
  const where = tipo ? eq(familiesBcv.tipo, tipo) : undefined;
  const rows = await db.select().from(familiesBcv).where(where).orderBy(familiesBcv.tipo, familiesBcv.codigo);
  return c.json({ data: rows });
});

familiesRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(familiesBcv).where(eq(familiesBcv.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

familiesRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(familiesBcv).values(body).returning();
  return c.json(row, 201);
});

familiesRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(familiesBcv).set(body).where(eq(familiesBcv.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

familiesRoutes.delete("/:id", async (c) => {
  const [row] = await db.delete(familiesBcv).where(eq(familiesBcv.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
