import { Hono } from "hono";
import { db } from "../db/connection.js";
import { measurements, measurementDetails, projectItems } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const measurementsRoutes = new Hono();
measurementsRoutes.use("*", authMiddleware);

// GET /api/projects/:id/measurements
measurementsRoutes.get("/projects/:id/measurements", async (c) => {
  const projectId = c.req.param("id");
  const rows = await db.select().from(measurements).where(eq(measurements.projectId, projectId)).orderBy(measurements.numero);
  return c.json(rows);
});

// POST /api/projects/:id/measurements
measurementsRoutes.post("/projects/:id/measurements", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();
  const [row] = await db.insert(measurements).values({ ...body, projectId }).returning();
  return c.json(row, 201);
});

// GET /api/projects/:id/measurements/:mId/details
measurementsRoutes.get("/projects/:id/measurements/:mId/details", async (c) => {
  const mId = c.req.param("mId");
  const details = await db.select({
    id: measurementDetails.id,
    projectItemId: measurementDetails.projectItemId,
    descripcion: measurementDetails.descripcion,
    iguales: measurementDetails.iguales,
    largo: measurementDetails.largo,
    ancho: measurementDetails.ancho,
    alto: measurementDetails.alto,
    total: measurementDetails.total,
    codigoPartida: projectItems.codigoPartida,
    numeroPar: projectItems.numeroPar,
  })
  .from(measurementDetails)
  .leftJoin(projectItems, eq(measurementDetails.projectItemId, projectItems.id))
  .where(eq(measurementDetails.measurementId, mId));
  return c.json(details);
});

// POST /api/projects/:id/measurements/:mId/details
measurementsRoutes.post("/projects/:id/measurements/:mId/details", async (c) => {
  const mId = c.req.param("mId");
  const body = await c.req.json();
  
  const iguales = Number(body.iguales || 1);
  const largo = body.largo ? Number(body.largo) : 1;
  const ancho = body.ancho ? Number(body.ancho) : 1;
  const alto = body.alto ? Number(body.alto) : 1;
  const total = iguales * largo * ancho * alto;

  const [row] = await db.insert(measurementDetails).values({
    measurementId: mId,
    projectItemId: body.projectItemId,
    descripcion: body.descripcion,
    iguales: String(iguales),
    largo: body.largo ? String(largo) : null,
    ancho: body.ancho ? String(ancho) : null,
    alto: body.alto ? String(alto) : null,
    total: String(total),
  }).returning();
  
  return c.json(row, 201);
});

// PUT /api/projects/:id/measurements/:mId/details/:detailId
measurementsRoutes.put("/projects/:id/measurements/:mId/details/:detailId", async (c) => {
  const detailId = c.req.param("detailId");
  const body = await c.req.json();
  
  const iguales = Number(body.iguales || 1);
  const largo = body.largo ? Number(body.largo) : 1;
  const ancho = body.ancho ? Number(body.ancho) : 1;
  const alto = body.alto ? Number(body.alto) : 1;
  const total = iguales * largo * ancho * alto;

  const [row] = await db.update(measurementDetails).set({
    descripcion: body.descripcion,
    iguales: String(iguales),
    largo: body.largo ? String(largo) : null,
    ancho: body.ancho ? String(ancho) : null,
    alto: body.alto ? String(alto) : null,
    total: String(total),
  }).where(eq(measurementDetails.id, detailId)).returning();
  
  return c.json(row);
});

// DELETE /api/projects/:id/measurements/:mId/details/:detailId
measurementsRoutes.delete("/projects/:id/measurements/:mId/details/:detailId", async (c) => {
  const detailId = c.req.param("detailId");
  await db.delete(measurementDetails).where(eq(measurementDetails.id, detailId));
  return c.json({ success: true });
});

// POST /api/projects/:id/measurements/:mId/apply
// Applica la sumatoria de totales de esta medición a la tabla projectItems
measurementsRoutes.post("/projects/:id/measurements/:mId/apply", async (c) => {
  const mId = c.req.param("mId");
  
  // Agrupar los totales por projectItemId
  const sums = await db.select({
    projectItemId: measurementDetails.projectItemId,
    totalAcumulado: sql<number>`SUM(${measurementDetails.total}::numeric)`
  })
  .from(measurementDetails)
  .where(eq(measurementDetails.measurementId, mId))
  .groupBy(measurementDetails.projectItemId);

  for (const s of sums) {
    if (s.projectItemId) {
      // Get current project item to update total price properly
      const [pItem] = await db.select().from(projectItems).where(eq(projectItems.id, s.projectItemId)).limit(1);
      if (pItem) {
        const pU = Number(pItem.precioUnitario);
        const qty = Number(s.totalAcumulado);
        const montoTotal = qty * pU;

        await db.update(projectItems)
          .set({ 
            cantidad: String(qty),
            montoTotal: String(montoTotal),
            updatedAt: new Date()
          })
          .where(eq(projectItems.id, s.projectItemId));
      }
    }
  }

  return c.json({ success: true, updatedItems: sums.length });
});
