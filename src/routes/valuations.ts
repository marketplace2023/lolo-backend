import { Hono } from "hono";
import { db } from "../db/connection.js";
import { 
  valuations, valuationDetails, projectItems
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const valuationsRoutes = new Hono();
valuationsRoutes.use("*", authMiddleware);

// GET /api/projects/:id/valuations
valuationsRoutes.get("/projects/:id/valuations", async (c) => {
  const projectId = c.req.param("id");
  const rows = await db.select().from(valuations).where(eq(valuations.projectId, projectId)).orderBy(valuations.numero);
  return c.json(rows);
});

// POST /api/projects/:id/valuations
valuationsRoutes.post("/projects/:id/valuations", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.insert(valuations).values({ ...body, projectId }).returning();
  
  // Auto-generate details for all project items
  const items = await db.select().from(projectItems).where(eq(projectItems.projectId, projectId));
  if (items.length > 0) {
    const details = items.map(item => ({
      valuationId: row.id,
      projectItemId: item.id,
      cantidadValuada: "0",
      cantidadAcumulada: "0"
    }));
    await db.insert(valuationDetails).values(details);
  }

  return c.json(row, 201);
});

// GET /api/projects/:id/valuations/:valId/details
valuationsRoutes.get("/projects/:id/valuations/:valId/details", async (c) => {
  const valId = c.req.param("valId");
  
  const details = await db.select({
    id: valuationDetails.id,
    projectItemId: valuationDetails.projectItemId,
    cantidadValuada: valuationDetails.cantidadValuada,
    cantidadAcumulada: valuationDetails.cantidadAcumulada,
    codigoPartida: projectItems.codigoPartida,
    numeroPar: projectItems.numeroPar,
    cantidadOriginal: projectItems.cantidad,
    precioUnitario: projectItems.precioUnitario,
    montoTotal: projectItems.montoTotal
  })
  .from(valuationDetails)
  .leftJoin(projectItems, eq(valuationDetails.projectItemId, projectItems.id))
  .where(eq(valuationDetails.valuationId, valId));
  
  return c.json(details);
});

// PUT /api/projects/:id/valuations/:valId/details
valuationsRoutes.put("/projects/:id/valuations/:valId/details", async (c) => {
  const body = await c.req.json(); // array of { id, cantidadValuada }
  
  for (const item of body) {
    if (item.cantidadValuada !== undefined) {
      await db.update(valuationDetails)
        .set({ cantidadValuada: String(item.cantidadValuada) })
        .where(eq(valuationDetails.id, item.id));
    }
  }
  return c.json({ success: true });
});
