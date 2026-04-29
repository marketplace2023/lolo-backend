import { Hono } from "hono";
import { db } from "../db/connection.js";
import { projectExtraItems, apuAnalyses } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const extrasRoutes = new Hono();
extrasRoutes.use("*", authMiddleware);

// GET /api/projects/:id/extras
extrasRoutes.get("/projects/:id/extras", async (c) => {
  const projectId = c.req.param("id");
  const rows = await db
    .select({
      id: projectExtraItems.id,
      projectId: projectExtraItems.projectId,
      apuId: projectExtraItems.apuId,
      codigoPartida: projectExtraItems.codigoPartida,
      descripcion: projectExtraItems.descripcion,
      unidad: projectExtraItems.unidad,
      cantidad: projectExtraItems.cantidad,
      precioUnitario: projectExtraItems.precioUnitario,
      montoTotal: projectExtraItems.montoTotal,
      motivo: projectExtraItems.motivo,
      fechaAprobacion: projectExtraItems.fechaAprobacion,
      createdAt: projectExtraItems.createdAt,
      apuCodigo: apuAnalyses.codigo,
      apuDescripcion: apuAnalyses.descripcion,
    })
    .from(projectExtraItems)
    .leftJoin(apuAnalyses, eq(projectExtraItems.apuId, apuAnalyses.id))
    .where(eq(projectExtraItems.projectId, projectId))
    .orderBy(projectExtraItems.codigoPartida);

  return c.json(rows);
});

// POST /api/projects/:id/extras
extrasRoutes.post("/projects/:id/extras", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json();

  const cantidad = Number(body.cantidad ?? 0);
  const precioUnitario = Number(body.precioUnitario ?? 0);
  const montoTotal = cantidad * precioUnitario;

  const [row] = await db
    .insert(projectExtraItems)
    .values({
      ...body,
      projectId,
      cantidad: String(cantidad),
      precioUnitario: String(precioUnitario),
      montoTotal: String(montoTotal),
    })
    .returning();

  return c.json(row, 201);
});

// PUT /api/projects/:id/extras/:extraId
extrasRoutes.put("/projects/:id/extras/:extraId", async (c) => {
  const extraId = c.req.param("extraId");
  const body = await c.req.json();

  const cantidad = Number(body.cantidad ?? 0);
  const precioUnitario = Number(body.precioUnitario ?? 0);
  const montoTotal = cantidad * precioUnitario;

  const [row] = await db
    .update(projectExtraItems)
    .set({
      ...body,
      cantidad: String(cantidad),
      precioUnitario: String(precioUnitario),
      montoTotal: String(montoTotal),
      updatedAt: new Date(),
    })
    .where(eq(projectExtraItems.id, extraId))
    .returning();

  return c.json(row);
});

// DELETE /api/projects/:id/extras/:extraId
extrasRoutes.delete("/projects/:id/extras/:extraId", async (c) => {
  const extraId = c.req.param("extraId");
  await db.delete(projectExtraItems).where(eq(projectExtraItems.id, extraId));
  return c.json({ success: true });
});
