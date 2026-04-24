import { Hono } from "hono";
import { db } from "../db/connection.js";
import { valuations, valuationDetails, budgetsAumentos, budgetsDisminuciones } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const budgetsRoutes = new Hono();
budgetsRoutes.use("*", authMiddleware);

// ── Valuaciones ──────────────────────────────────────────────────────────
budgetsRoutes.get("/projects/:projectId/valuations", async (c) => {
  const rows = await db.select().from(valuations).where(eq(valuations.projectId, c.req.param("projectId")));
  return c.json({ data: rows });
});

budgetsRoutes.post("/projects/:projectId/valuations", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(valuations).values({ ...body, projectId: c.req.param("projectId") }).returning();
  return c.json(row, 201);
});

budgetsRoutes.put("/projects/:projectId/valuations/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(valuations).set({ ...body, updatedAt: new Date() })
    .where(eq(valuations.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

budgetsRoutes.delete("/projects/:projectId/valuations/:id", async (c) => {
  const [row] = await db.delete(valuations).where(eq(valuations.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// ── Aumentos ─────────────────────────────────────────────────────────────
budgetsRoutes.get("/projects/:projectId/aumentos", async (c) => {
  const rows = await db.select().from(budgetsAumentos).where(eq(budgetsAumentos.projectId, c.req.param("projectId")));
  return c.json({ data: rows });
});

budgetsRoutes.post("/projects/:projectId/aumentos", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(budgetsAumentos).values({ ...body, projectId: c.req.param("projectId") }).returning();
  return c.json(row, 201);
});

// ── Disminuciones ─────────────────────────────────────────────────────────
budgetsRoutes.get("/projects/:projectId/disminuciones", async (c) => {
  const rows = await db.select().from(budgetsDisminuciones).where(eq(budgetsDisminuciones.projectId, c.req.param("projectId")));
  return c.json({ data: rows });
});

budgetsRoutes.post("/projects/:projectId/disminuciones", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(budgetsDisminuciones).values({ ...body, projectId: c.req.param("projectId") }).returning();
  return c.json(row, 201);
});
