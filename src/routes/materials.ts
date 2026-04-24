import { Hono } from "hono";
import { db } from "../db/connection.js";
import { materials, familiesBcv } from "../db/schema.js";
import { eq, ilike, or, count, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const materialsRoutes = new Hono();
materialsRoutes.use("*", authMiddleware);

// GET /api/materials
materialsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query() as Record<string, string>);
  const familiaId = c.req.query("familiaId");

  const conditions = [];
  if (search) conditions.push(or(ilike(materials.codigo, `%${search}%`), ilike(materials.descripcion, `%${search}%`))!);
  if (familiaId) conditions.push(eq(materials.familiaId, familiaId));

  const where = conditions.length > 0
    ? conditions.reduce((acc, cond) => acc && cond!)
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(materials).where(where);
  const rows = await db.select({
    id: materials.id,
    codigo: materials.codigo,
    descripcion: materials.descripcion,
    unidad: materials.unidad,
    precio: materials.precio,
    desperdicio: materials.desperdicio,
    proveedor: materials.proveedor,
    importado: materials.importado,
    porcentajeNacional: materials.porcentajeNacional,
    fechaActualizacion: materials.fechaActualizacion,
    familiaId: materials.familiaId,
    codigoFamilia: materials.codigoFamilia,
  }).from(materials).where(where).orderBy(materials.codigo).limit(limit).offset(offset);

  return c.json(paginate(rows, Number(total), page, limit));
});

// GET /api/materials/:id
materialsRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(materials).where(eq(materials.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// POST /api/materials
materialsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(materials).values(body).returning();
  return c.json(row, 201);
});

// PUT /api/materials/:id
materialsRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(materials).set({ ...body, updatedAt: new Date() })
    .where(eq(materials.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /api/materials/:id
materialsRoutes.delete("/:id", async (c) => {
  const [row] = await db.delete(materials).where(eq(materials.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
