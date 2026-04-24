import { Hono } from "hono";
import { db } from "../db/connection.js";
import { companies } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const companiesRoutes = new Hono();
companiesRoutes.use("*", authMiddleware);

companiesRoutes.get("/", async (c) => {
  const rows = await db.select().from(companies);
  return c.json({ data: rows });
});

companiesRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(companies).where(eq(companies.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

companiesRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(companies).set({ ...body, updatedAt: new Date() })
    .where(eq(companies.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});
