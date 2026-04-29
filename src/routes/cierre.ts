import { Hono } from "hono";
import { db } from "../db/connection.js";
import {
  projects, chapters, projectItems,
  budgetsAumentos, budgetAumentoDetails,
  budgetsDisminuciones, budgetDisminucionDetails,
  projectExtraItems,
  valuations, valuationDetails,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const cierreRoutes = new Hono();
cierreRoutes.use("*", authMiddleware);

// GET /api/projects/:id/reports/cierre
// Returns the final settlement (liquidación) of a project:
// Original ± Aumentos ∓ Disminuciones + Extras = Cantidad Final
cierreRoutes.get("/projects/:id/reports/cierre", async (c) => {
  const projectId = c.req.param("id");

  // 1. Project info
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return c.json({ error: "Project not found" }, 404);

  // 2. Chapters + Items
  const capRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, projectId))
    .orderBy(chapters.numero);

  const itemsRows = await db
    .select()
    .from(projectItems)
    .where(eq(projectItems.projectId, projectId))
    .orderBy(projectItems.numeroPar);

  // 3. Aumentos — aggregate by projectItemId
  const aumHeaders = await db
    .select()
    .from(budgetsAumentos)
    .where(eq(budgetsAumentos.projectId, projectId));

  const aumIds = aumHeaders.map(a => a.id);
  const aumMap: Record<string, number> = {};

  if (aumIds.length > 0) {
    for (const aumId of aumIds) {
      const details = await db
        .select()
        .from(budgetAumentoDetails)
        .where(eq(budgetAumentoDetails.aumentoId, aumId));

      for (const d of details) {
        if (d.projectItemId) {
          aumMap[d.projectItemId] = (aumMap[d.projectItemId] ?? 0) + Number(d.cantidadAumento ?? 0);
        }
      }
    }
  }

  // 4. Disminuciones — aggregate by projectItemId
  const disHeaders = await db
    .select()
    .from(budgetsDisminuciones)
    .where(eq(budgetsDisminuciones.projectId, projectId));

  const disIds = disHeaders.map(d => d.id);
  const disMap: Record<string, number> = {};

  if (disIds.length > 0) {
    for (const disId of disIds) {
      const details = await db
        .select()
        .from(budgetDisminucionDetails)
        .where(eq(budgetDisminucionDetails.disminucionId, disId));

      for (const d of details) {
        if (d.projectItemId) {
          disMap[d.projectItemId] = (disMap[d.projectItemId] ?? 0) + Number(d.cantidadDisminucion ?? 0);
        }
      }
    }
  }

  // 5. Executed (acumulado from last valuation per item)
  const allValuations = await db
    .select()
    .from(valuations)
    .where(eq(valuations.projectId, projectId))
    .orderBy(valuations.numero);

  // Executed = cantidadAcumulada from the LAST valuation detail for each item
  const executedMap: Record<string, number> = {};

  if (allValuations.length > 0) {
    const lastVal = allValuations[allValuations.length - 1];
    const lastDetails = await db
      .select()
      .from(valuationDetails)
      .where(eq(valuationDetails.valuationId, lastVal.id));

    for (const d of lastDetails) {
      if (d.projectItemId) {
        executedMap[d.projectItemId] = Number(d.cantidadAcumulada ?? 0);
      }
    }
  }

  // 6. Extra items
  const extraItems = await db
    .select()
    .from(projectExtraItems)
    .where(eq(projectExtraItems.projectId, projectId))
    .orderBy(projectExtraItems.codigoPartida);

  // 7. Build line items for original partidas
  const lineItems = itemsRows.map(item => {
    const cantOrig = Number(item.cantidad ?? 0);
    const totalAumentos = aumMap[item.id] ?? 0;
    const totalDisminuciones = disMap[item.id] ?? 0;
    const cantFinal = cantOrig + totalAumentos - totalDisminuciones;
    const pu = Number(item.precioUnitario ?? 0);
    const ejecutado = executedMap[item.id] ?? cantFinal; // fallback to cantFinal if no valuations
    const montoFinal = cantFinal * pu;
    const chapter = capRows.find(c => c.id === item.chapterId);

    return {
      id: item.id,
      chapterId: item.chapterId,
      chapterDescripcion: chapter?.descripcion ?? "",
      codigoPartida: item.codigoPartida,
      numeroPar: item.numeroPar,
      tipo: "original" as const,
      unidad: null as string | null,
      cantOriginal: cantOrig,
      totalAumentos,
      totalDisminuciones,
      cantFinal,
      ejecutado,
      pendiente: Math.max(0, cantFinal - ejecutado),
      precioUnitario: pu,
      montoFinal,
    };
  });

  // 8. Extra items as separate rows
  const extraLineItems = extraItems.map(e => ({
    id: e.id,
    chapterId: null as string | null,
    chapterDescripcion: "Obras Extra",
    codigoPartida: e.codigoPartida,
    numeroPar: 0,
    tipo: "extra" as const,
    unidad: e.unidad,
    cantOriginal: 0,
    totalAumentos: 0,
    totalDisminuciones: 0,
    cantFinal: Number(e.cantidad ?? 0),
    ejecutado: Number(e.cantidad ?? 0), // extras are assumed fully executed
    pendiente: 0,
    precioUnitario: Number(e.precioUnitario ?? 0),
    montoFinal: Number(e.montoTotal ?? 0),
    motivo: e.motivo,
    fechaAprobacion: e.fechaAprobacion,
  }));

  // 9. Totals
  const montoBase = lineItems.reduce((s, l) => s + l.montoFinal, 0);
  const montoExtras = extraLineItems.reduce((s, l) => s + l.montoFinal, 0);
  const montoTotal = montoBase + montoExtras;

  const impuesto = project.aplicaImpuesto ? Number(project.porcentajeImpuesto ?? 0) / 100 : 0;
  const montoImpuesto = montoTotal * impuesto;
  const montoNeto = montoTotal + montoImpuesto;

  return c.json({
    project,
    chapters: capRows,
    lineItems,
    extraLineItems,
    totals: {
      montoBase,
      montoExtras,
      montoTotal,
      porcentajeImpuesto: Number(project.porcentajeImpuesto ?? 0),
      montoImpuesto,
      montoNeto,
    },
  });
});
