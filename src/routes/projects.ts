import { Hono } from "hono";
import { db } from "../db/connection.js";
import { projects, chapters, projectItems, apuAnalyses } from "../db/schema.js";
import { eq, count, sum, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const projectsRoutes = new Hono();
projectsRoutes.use("*", authMiddleware);

// GET /api/projects
projectsRoutes.get("/", async (c) => {
  const rows = await db.select({
    id: projects.id, codigo: projects.codigo, descripcion: projects.descripcion,
    status: projects.status, fechaPresupuesto: projects.fechaPresupuesto,
    moneda: projects.moneda, costoIndirecto: projects.costoIndirecto,
    createdAt: projects.createdAt,
  }).from(projects).orderBy(desc(projects.createdAt));
  return c.json({ data: rows });
});

// GET /api/projects/:id
projectsRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(projects).where(eq(projects.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/projects
projectsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(projects).values({
    ...body,
    id: body.id ?? crypto.randomUUID(),
  }).returning();
  return c.json(row, 201);
});

// PUT /api/projects/:id
projectsRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(projects).set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /api/projects/:id
projectsRoutes.delete("/:id", async (c) => {
  const [row] = await db.delete(projects).where(eq(projects.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /api/projects/:id/budget — chapters + items
projectsRoutes.get("/:id/budget", async (c) => {
  const projectId = c.req.param("id");
  const chaps = await db.select().from(chapters).where(eq(chapters.projectId, projectId)).orderBy(chapters.numero);
  const items = await db.select().from(projectItems).where(eq(projectItems.projectId, projectId)).orderBy(projectItems.numeroPar);

  const grouped = chaps.map((ch) => ({
    ...ch,
    partidas: items.filter((i) => i.chapterId === ch.id),
  }));

  // Summary totals
  const [totals] = await db.select({
    totalPartidas: count(),
    montoTotal: sum(projectItems.montoTotal),
  }).from(projectItems).where(eq(projectItems.projectId, projectId));

  return c.json({ capitulos: grouped, totals });
});

// POST /api/projects/:id/budget/items
projectsRoutes.post("/:id/budget/items", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.insert(projectItems).values({ ...body, projectId }).returning();
  return c.json(row, 201);
});

// PUT /api/projects/:id/budget/items/:itemId
projectsRoutes.put("/:id/budget/items/:itemId", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(projectItems).set({ ...body, updatedAt: new Date() })
    .where(eq(projectItems.id, c.req.param("itemId"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /api/projects/:id/budget/items/:itemId
projectsRoutes.delete("/:id/budget/items/:itemId", async (c) => {
  const [row] = await db.delete(projectItems).where(eq(projectItems.id, c.req.param("itemId"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// GET /api/projects/:id/budget/apu/:code
projectsRoutes.get("/:id/budget/apu/:code", async (c) => {
  const { id: projectId, code } = c.req.param();
  const [apu] = await db.select().from(apuAnalyses)
    .where(eq(apuAnalyses.projectId, projectId) && eq(apuAnalyses.codigo, code) as never)
    .limit(1);
  if (!apu) return c.json({ error: "APU not found" }, 404);
  return c.json(apu);
});
