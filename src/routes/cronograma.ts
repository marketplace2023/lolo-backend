import { Hono } from "hono";
import { db } from "../db/connection.js";
import {
  projects, chapters, projectItems, apuAnalyses,
} from "../db/schema.js";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const cronogramaRoutes = new Hono();
cronogramaRoutes.use("*", authMiddleware);

/**
 * GET /api/projects/:id/cronograma
 * Returns all chapters with their items, each with:
 *   - duracionDias (from APU or 0)
 *   - fechaInicio (from projectItems or null)
 *   - calculated fechaFin based on start + duration
 */
cronogramaRoutes.get("/projects/:id/cronograma", async (c) => {
  const projectId = c.req.param("id");

  const [proj] = await db.select({
    id: projects.id,
    codigo: projects.codigo,
    descripcion: projects.descripcion,
    fechaCronograma: projects.fechaCronograma,
    horasPorDia: projects.horasPorDia,
    finesDeSemanaTrabajo: projects.finesDeSemanaTrabajo,
  }).from(projects).where(eq(projects.id, projectId)).limit(1);

  if (!proj) return c.json({ error: "Project not found" }, 404);

  const chaps = await db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, projectId))
    .orderBy(asc(chapters.numero));

  const items = await db
    .select({
      id: projectItems.id,
      chapterId: projectItems.chapterId,
      codigoPartida: projectItems.codigoPartida,
      numeroPar: projectItems.numeroPar,
      cantidad: projectItems.cantidad,
      precioUnitario: projectItems.precioUnitario,
      montoTotal: projectItems.montoTotal,
      // APU data
      apuId: apuAnalyses.id,
      apuDescripcion: apuAnalyses.descripcion,
      apuCodigo: apuAnalyses.codigo,
      duracionDias: apuAnalyses.duracionDias,
      horasHombre: apuAnalyses.horasHombre,
      rendimiento: apuAnalyses.rendimiento,
      unidad: apuAnalyses.unidad,
      // Cronograma fields stored on projectItems
      fechaInicioPartida: projectItems.fechaInicioPartida,
    })
    .from(projectItems)
    .leftJoin(apuAnalyses, eq(projectItems.apuId, apuAnalyses.id))
    .where(eq(projectItems.projectId, projectId))
    .orderBy(asc(projectItems.numeroPar));

  // Build Gantt data: calculate fechaFin per item
  const ganttItems = items.map((item) => {
    const dias = Number(item.duracionDias ?? 0);
    const qty = Number(item.cantidad ?? 1);
    // Total duration = duration per unit × quantity (capped at a reasonable max)
    const totalDias = Math.ceil(dias * qty);

    let fechaFin: string | null = null;
    if (item.fechaInicioPartida && totalDias > 0) {
      const start = new Date(item.fechaInicioPartida);
      start.setDate(start.getDate() + totalDias);
      fechaFin = start.toISOString().split("T")[0];
    }

    return {
      ...item,
      totalDias,
      fechaFin,
    };
  });

  // Group by chapter
  const capitulos = chaps.map((ch) => ({
    ...ch,
    partidas: ganttItems.filter((i) => i.chapterId === ch.id),
  }));

  // Overall project span
  const allStarts = ganttItems
    .filter((i) => i.fechaInicioPartida)
    .map((i) => new Date(i.fechaInicioPartida!).getTime());
  const allEnds = ganttItems
    .filter((i) => i.fechaFin)
    .map((i) => new Date(i.fechaFin!).getTime());

  const projectStart = allStarts.length ? new Date(Math.min(...allStarts)).toISOString().split("T")[0] : null;
  const projectEnd = allEnds.length ? new Date(Math.max(...allEnds)).toISOString().split("T")[0] : null;

  return c.json({ project: proj, capitulos, projectStart, projectEnd });
});

/**
 * PUT /api/projects/:id/cronograma/items/:itemId
 * Update the start date and duration override for a single project item
 */
cronogramaRoutes.put("/projects/:id/cronograma/items/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const body = await c.req.json() as { fechaInicioPartida?: string };

  const [row] = await db
    .update(projectItems)
    .set({
      fechaInicioPartida: body.fechaInicioPartida ?? null,
      updatedAt: new Date(),
    })
    .where(eq(projectItems.id, itemId))
    .returning();

  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

/**
 * PUT /api/projects/:id/cronograma/bulk
 * Bulk-update start dates for multiple items at once
 */
cronogramaRoutes.put("/projects/:id/cronograma/bulk", async (c) => {
  const body = await c.req.json() as { items: { id: string; fechaInicioPartida: string | null }[] };

  if (!Array.isArray(body.items)) return c.json({ error: "items must be an array" }, 400);

  const results = await Promise.all(
    body.items.map(({ id, fechaInicioPartida }) =>
      db.update(projectItems)
        .set({ fechaInicioPartida: fechaInicioPartida ?? null, updatedAt: new Date() })
        .where(eq(projectItems.id, id))
        .returning()
    )
  );

  return c.json({ updated: results.flat().length });
});
