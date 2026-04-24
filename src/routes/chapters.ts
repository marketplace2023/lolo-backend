import { Hono } from "hono";
import { randomUUID } from "crypto";
import { db } from "../db/connection.js";
import { chapters, projectItems, items, apuAnalyses, valuationDetails, measurementDetails, memorias, budgetAumentoDetails, budgetDisminucionDetails } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const chaptersRoutes = new Hono();
chaptersRoutes.use("*", authMiddleware);

// POST /api/projects/:id/chapters
chaptersRoutes.post("/projects/:id/chapters", async (c) => {
  const projectId = c.req.param("id");
  const { numero, descripcion } = await c.req.json();
  const [row] = await db.insert(chapters).values({
    id: randomUUID(), projectId, numero: Number(numero), descripcion
  }).returning();
  return c.json(row, 201);
});

// PUT /api/chapters/:chapterId
chaptersRoutes.put("/chapters/:chapterId", async (c) => {
  const chapterId = c.req.param("chapterId");
  const { numero, descripcion } = await c.req.json();
  const [row] = await db.update(chapters).set({
    numero: Number(numero), descripcion
  }).where(eq(chapters.id, chapterId)).returning();
  return c.json(row);
});

// DELETE /api/chapters/:chapterId
chaptersRoutes.delete("/chapters/:chapterId", async (c) => {
  const chapterId = c.req.param("chapterId");
  await db.delete(chapters).where(eq(chapters.id, chapterId));
  return c.json({ success: true });
});

// POST /api/chapters/:chapterId/items
// Añade un ítem maestro al presupuesto dentro de este capítulo
chaptersRoutes.post("/chapters/:chapterId/items", async (c) => {
  const chapterId = c.req.param("chapterId");
  const { masterItemId, numeroPar, cantidad } = await c.req.json();

  // Find the chapter
  const [cap] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!cap) return c.json({ error: "Chapter not found" }, 404);

  // Find the master item
  const [mItem] = await db.select().from(items).where(eq(items.id, masterItemId)).limit(1);
  if (!mItem) return c.json({ error: "Master item not found" }, 404);

  // Find if there's an APU for this item in this project, or global
  let [apu] = await db.select().from(apuAnalyses)
    .where(eq(apuAnalyses.codigo, mItem.codigo))
    .limit(1); // Simplification: in reality, we might need to copy the global APU to the project APU table.

  const pU = Number(mItem.precioUnitario);
  const q = Number(cantidad || 0);
  const montoTotal = pU * q;

  const [row] = await db.insert(projectItems).values({
    projectId: cap.projectId,
    chapterId,
    apuId: apu?.id,
    codigoPartida: mItem.codigo,
    numeroPar: Number(numeroPar),
    cantidad: String(q),
    precioUnitario: String(pU),
    montoTotal: String(montoTotal),
  }).returning();

  return c.json(row, 201);
});

// DELETE /api/project-items/:itemId
chaptersRoutes.delete("/project-items/:itemId", async (c) => {
  const itemId = c.req.param("itemId");

  // Delete child records first to avoid FK constraint violations
  await db.delete(valuationDetails).where(eq(valuationDetails.projectItemId, itemId));
  await db.delete(measurementDetails).where(eq(measurementDetails.projectItemId, itemId));
  await db.delete(memorias).where(eq(memorias.projectItemId, itemId));
  await db.delete(budgetAumentoDetails).where(eq(budgetAumentoDetails.projectItemId, itemId));
  await db.delete(budgetDisminucionDetails).where(eq(budgetDisminucionDetails.projectItemId, itemId));

  await db.delete(projectItems).where(eq(projectItems.id, itemId));
  return c.json({ success: true });
});
