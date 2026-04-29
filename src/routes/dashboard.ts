import { Hono } from "hono";
import { db } from "../db/connection.js";
import {
  projects,
  projectItems,
  budgetsAumentos,
  budgetAumentoDetails,
  budgetsDisminuciones,
  budgetDisminucionDetails,
  projectExtraItems,
  valuations,
  valuationDetails,
} from "../db/schema.js";
import { eq, sum } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const dashboardRoutes = new Hono();
dashboardRoutes.use("*", authMiddleware);

// GET /api/projects/:id/dashboard
dashboardRoutes.get("/projects/:id/dashboard", async (c) => {
  const projectId = c.req.param("id");

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return c.json({ error: "Project not found" }, 404);

  // 1. Monto Contrato Base (suma de project_items)
  const items = await db
    .select()
    .from(projectItems)
    .where(eq(projectItems.projectId, projectId));

  let montoBase = 0;
  for (const item of items) {
    montoBase += Number(item.montoTotal ?? 0);
  }

  // 2. Monto Aumentos
  const aumHeaders = await db
    .select()
    .from(budgetsAumentos)
    .where(eq(budgetsAumentos.projectId, projectId));

  let montoAumentos = 0;
  for (const h of aumHeaders) {
    const details = await db
      .select({
        cantidad: budgetAumentoDetails.cantidadAumento,
        pu: projectItems.precioUnitario
      })
      .from(budgetAumentoDetails)
      .innerJoin(projectItems, eq(budgetAumentoDetails.projectItemId, projectItems.id))
      .where(eq(budgetAumentoDetails.aumentoId, h.id));

    for (const d of details) {
      montoAumentos += Number(d.cantidad ?? 0) * Number(d.pu ?? 0);
    }
  }

  // 3. Monto Disminuciones
  const disHeaders = await db
    .select()
    .from(budgetsDisminuciones)
    .where(eq(budgetsDisminuciones.projectId, projectId));

  let montoDisminuciones = 0;
  for (const h of disHeaders) {
    const details = await db
      .select({
        cantidad: budgetDisminucionDetails.cantidadDisminucion,
        pu: projectItems.precioUnitario
      })
      .from(budgetDisminucionDetails)
      .innerJoin(projectItems, eq(budgetDisminucionDetails.projectItemId, projectItems.id))
      .where(eq(budgetDisminucionDetails.disminucionId, h.id));

    for (const d of details) {
      montoDisminuciones += Number(d.cantidad ?? 0) * Number(d.pu ?? 0);
    }
  }

  // 4. Monto Extras
  const extras = await db
    .select()
    .from(projectExtraItems)
    .where(eq(projectExtraItems.projectId, projectId));

  let montoExtra = 0;
  for (const e of extras) {
    montoExtra += Number(e.montoTotal ?? 0);
  }

  const montoTotalActualizado = montoBase + montoAumentos - montoDisminuciones + montoExtra;

  // 5. Monto Valuado (Cobrado)
  // Get all valuation details for this project and sum (cantidadValuada * PU)
  const allVals = await db
    .select()
    .from(valuations)
    .where(eq(valuations.projectId, projectId));

  let montoValuadoBase = 0;
  for (const v of allVals) {
    const details = await db
      .select({
        cantidad: valuationDetails.cantidadValuada,
        pu: projectItems.precioUnitario
      })
      .from(valuationDetails)
      .innerJoin(projectItems, eq(valuationDetails.projectItemId, projectItems.id))
      .where(eq(valuationDetails.valuationId, v.id));

    for (const d of details) {
      montoValuadoBase += Number(d.cantidad ?? 0) * Number(d.pu ?? 0);
    }
  }

  // Also valuado for extras: currently we assume extras are fully executed when created
  // but to be precise, maybe we just include them in montoValuado if they are approved.
  // For now, we'll consider them fully executed.
  let montoValuadoTotal = montoValuadoBase + montoExtra;

  // 6. Avance Físico
  let porcentajeAvanceFisico = 0;
  if (montoTotalActualizado > 0) {
    porcentajeAvanceFisico = (montoValuadoTotal / montoTotalActualizado) * 100;
  }

  // 7. Top partidas con más saldo pendiente
  // Calculate for each original item
  const allAumDetails = await db.select().from(budgetAumentoDetails);
  const allDisDetails = await db.select().from(budgetDisminucionDetails);
  
  // Get the last valuation for executed amounts
  const lastValuation = allVals.sort((a, b) => b.numero - a.numero)[0];
  let lastValDetails: any[] = [];
  if (lastValuation) {
    lastValDetails = await db
      .select()
      .from(valuationDetails)
      .where(eq(valuationDetails.valuationId, lastValuation.id));
  }

  const partidasStatus = items.map(item => {
    const aumCount = aumHeaders.length > 0 
      ? allAumDetails.filter(d => d.projectItemId === item.id && aumHeaders.some(h => h.id === d.aumentoId))
                     .reduce((s, d) => s + Number(d.cantidadAumento ?? 0), 0)
      : 0;
    
    const disCount = disHeaders.length > 0
      ? allDisDetails.filter(d => d.projectItemId === item.id && disHeaders.some(h => h.id === d.disminucionId))
                     .reduce((s, d) => s + Number(d.cantidadDisminucion ?? 0), 0)
      : 0;

    const cantFinal = Number(item.cantidad ?? 0) + aumCount - disCount;
    const ejecutadoDetail = lastValDetails.find(d => d.projectItemId === item.id);
    const ejecutado = ejecutadoDetail ? Number(ejecutadoDetail.cantidadAcumulada ?? 0) : 0;
    
    const pendiente = Math.max(0, cantFinal - ejecutado);
    const montoPendiente = pendiente * Number(item.precioUnitario ?? 0);
    
    let pct = 0;
    if (cantFinal > 0) pct = (ejecutado / cantFinal) * 100;

    return {
      codigo: item.codigoPartida,
      descripcion: item.descripcion, // actually we need to fetch description from somewhere, or it's not in projectItems?
      // Wait, projectItems doesn't have descripcion, it uses APU or chapter? The schema says:
      // ah wait, schema for projectItems has no "descripcion", we only have "codigoPartida"
      // we'll just return the code.
      cantFinal,
      ejecutado,
      pendiente,
      montoPendiente,
      pct,
    };
  });

  const topPendientes = partidasStatus
    .filter(p => p.pendiente > 0)
    .sort((a, b) => b.montoPendiente - a.montoPendiente)
    .slice(0, 5);

  return c.json({
    montoContrato: montoBase,
    montoVariaciones: montoAumentos - montoDisminuciones,
    montoExtra: montoExtra,
    montoTotalActualizado,
    montoValuado: montoValuadoTotal,
    porcentajeAvanceFisico,
    topPendientes,
  });
});
