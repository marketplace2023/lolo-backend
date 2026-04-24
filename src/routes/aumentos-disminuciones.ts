import { Hono } from "hono";
import { db } from "../db/connection.js";
import { 
  budgetsAumentos, budgetAumentoDetails, 
  budgetsDisminuciones, budgetDisminucionDetails,
  projectItems 
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const aumentosDisminucionesRoutes = new Hono();
aumentosDisminucionesRoutes.use("*", authMiddleware);

// --- AUMENTOS ---

// GET /api/projects/:id/aumentos
aumentosDisminucionesRoutes.get("/projects/:id/aumentos", async (c) => {
  const projectId = c.req.param("id");
  const rows = await db.select().from(budgetsAumentos).where(eq(budgetsAumentos.projectId, projectId)).orderBy(budgetsAumentos.numero);
  return c.json(rows);
});

// POST /api/projects/:id/aumentos
aumentosDisminucionesRoutes.post("/projects/:id/aumentos", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.insert(budgetsAumentos).values({ ...body, projectId }).returning();
  
  // Auto-generate details for all project items
  const items = await db.select().from(projectItems).where(eq(projectItems.projectId, projectId));
  if (items.length > 0) {
    const details = items.map(item => ({
      aumentoId: row.id,
      projectItemId: item.id,
      cantidadAumento: "0"
    }));
    await db.insert(budgetAumentoDetails).values(details);
  }

  return c.json(row, 201);
});

// GET /api/projects/:id/aumentos/:aumId/details
aumentosDisminucionesRoutes.get("/projects/:id/aumentos/:aumId/details", async (c) => {
  const aumId = c.req.param("aumId");
  
  const details = await db.select({
    id: budgetAumentoDetails.id,
    projectItemId: budgetAumentoDetails.projectItemId,
    cantidadAumento: budgetAumentoDetails.cantidadAumento,
    codigoPartida: projectItems.codigoPartida,
    numeroPar: projectItems.numeroPar,
    cantidadOriginal: projectItems.cantidad,
    precioUnitario: projectItems.precioUnitario,
    montoTotal: projectItems.montoTotal
  })
  .from(budgetAumentoDetails)
  .leftJoin(projectItems, eq(budgetAumentoDetails.projectItemId, projectItems.id))
  .where(eq(budgetAumentoDetails.aumentoId, aumId));
  
  return c.json(details);
});

// PUT /api/projects/:id/aumentos/:aumId/details
aumentosDisminucionesRoutes.put("/projects/:id/aumentos/:aumId/details", async (c) => {
  const body = await c.req.json(); // array of { id, cantidadAumento }
  
  for (const item of body) {
    if (item.cantidadAumento !== undefined) {
      await db.update(budgetAumentoDetails)
        .set({ cantidadAumento: String(item.cantidadAumento) })
        .where(eq(budgetAumentoDetails.id, item.id));
    }
  }
  return c.json({ success: true });
});

// --- DISMINUCIONES ---

// GET /api/projects/:id/disminuciones
aumentosDisminucionesRoutes.get("/projects/:id/disminuciones", async (c) => {
  const projectId = c.req.param("id");
  const rows = await db.select().from(budgetsDisminuciones).where(eq(budgetsDisminuciones.projectId, projectId)).orderBy(budgetsDisminuciones.numero);
  return c.json(rows);
});

// POST /api/projects/:id/disminuciones
aumentosDisminucionesRoutes.post("/projects/:id/disminuciones", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.insert(budgetsDisminuciones).values({ ...body, projectId }).returning();
  
  // Auto-generate details for all project items
  const items = await db.select().from(projectItems).where(eq(projectItems.projectId, projectId));
  if (items.length > 0) {
    const details = items.map(item => ({
      disminucionId: row.id,
      projectItemId: item.id,
      cantidadDisminucion: "0"
    }));
    await db.insert(budgetDisminucionDetails).values(details);
  }

  return c.json(row, 201);
});

// GET /api/projects/:id/disminuciones/:disId/details
aumentosDisminucionesRoutes.get("/projects/:id/disminuciones/:disId/details", async (c) => {
  const disId = c.req.param("disId");
  
  const details = await db.select({
    id: budgetDisminucionDetails.id,
    projectItemId: budgetDisminucionDetails.projectItemId,
    cantidadDisminucion: budgetDisminucionDetails.cantidadDisminucion,
    codigoPartida: projectItems.codigoPartida,
    numeroPar: projectItems.numeroPar,
    cantidadOriginal: projectItems.cantidad,
    precioUnitario: projectItems.precioUnitario,
    montoTotal: projectItems.montoTotal
  })
  .from(budgetDisminucionDetails)
  .leftJoin(projectItems, eq(budgetDisminucionDetails.projectItemId, projectItems.id))
  .where(eq(budgetDisminucionDetails.disminucionId, disId));
  
  return c.json(details);
});

// PUT /api/projects/:id/disminuciones/:disId/details
aumentosDisminucionesRoutes.put("/projects/:id/disminuciones/:disId/details", async (c) => {
  const body = await c.req.json(); // array of { id, cantidadDisminucion }
  
  for (const item of body) {
    if (item.cantidadDisminucion !== undefined) {
      await db.update(budgetDisminucionDetails)
        .set({ cantidadDisminucion: String(item.cantidadDisminucion) })
        .where(eq(budgetDisminucionDetails.id, item.id));
    }
  }
  return c.json({ success: true });
});
