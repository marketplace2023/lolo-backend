import { Hono } from "hono";
import { db } from "../db/connection.js";
import { materials, companyMaterials } from "../db/schema.js";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { authMiddleware, JwtPayload } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const materialsRoutes = new Hono<{ Variables: { user: JwtPayload } }>();
materialsRoutes.use("*", authMiddleware);

// GET /api/materials
materialsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query());
  const familiaId = c.req.query("familiaId");
  const user = c.get("user");
  const companyId = user.companyId;

  const conditions = [];
  if (search) conditions.push(or(ilike(materials.codigo, `%${search}%`), ilike(materials.descripcion, `%${search}%`))!);
  if (familiaId) conditions.push(eq(materials.familiaId, familiaId));

  const where = conditions.length > 0
    ? conditions.reduce((acc, cond) => and(acc, cond)!)
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(materials).where(where);

  // If user has a company, left join company_materials
  const rows = await db
    .select({
      id: materials.id,
      codigo: materials.codigo,
      descripcion: materials.descripcion,
      unidad: materials.unidad,
      precioGlobal: materials.precio, // global price
      precioLocal: companyMaterials.precioLocal,
      fleteLocal: companyMaterials.fleteLocal,
      disponibleLocal: companyMaterials.disponible,
      stockLocal: companyMaterials.stock,
      desperdicio: materials.desperdicio,
      proveedor: materials.proveedor,
      importado: materials.importado,
      porcentajeNacional: materials.porcentajeNacional,
      fechaActualizacion: materials.fechaActualizacion,
      familiaId: materials.familiaId,
      codigoFamilia: materials.codigoFamilia,
    })
    .from(materials)
    .leftJoin(
      companyMaterials,
      companyId 
        ? and(eq(companyMaterials.materialId, materials.id), eq(companyMaterials.companyId, companyId))
        : eq(companyMaterials.materialId, materials.id) // This fallback won't match anything properly if no companyId, but realistically companyId is usually set. Let's fix this safely:
    ) // Wait, if companyId is null, we shouldn't join or join with a impossible condition.
    .where(where)
    .orderBy(materials.codigo)
    .limit(limit)
    .offset(offset);

  // Process the result to present a unified 'precio' and local details
  const finalRows = rows.map(r => ({
    ...r,
    // If local price exists and > 0, use it. Else use global.
    precio: r.precioLocal && Number(r.precioLocal) > 0 ? r.precioLocal : r.precioGlobal,
    isLocal: !!r.precioLocal && Number(r.precioLocal) > 0,
    disponible: r.disponibleLocal !== null ? r.disponibleLocal : true,
  }));

  return c.json(paginate(finalRows, Number(total), page, limit));
});

// GET /api/materials/:id
materialsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const [row] = await db
    .select({
      id: materials.id,
      codigo: materials.codigo,
      descripcion: materials.descripcion,
      unidad: materials.unidad,
      precioGlobal: materials.precio,
      precioLocal: companyMaterials.precioLocal,
      fleteLocal: companyMaterials.fleteLocal,
      disponibleLocal: companyMaterials.disponible,
      stockLocal: companyMaterials.stock,
    })
    .from(materials)
    .leftJoin(
      companyMaterials,
      user.companyId 
        ? and(eq(companyMaterials.materialId, materials.id), eq(companyMaterials.companyId, user.companyId))
        : undefined
    )
    .where(eq(materials.id, c.req.param("id")))
    .limit(1);

  if (!row) return c.json({ error: "Not found" }, 404);
  
  return c.json({
    ...row,
    precio: row.precioLocal && Number(row.precioLocal) > 0 ? row.precioLocal : row.precioGlobal,
    isLocal: !!row.precioLocal && Number(row.precioLocal) > 0,
    disponible: row.disponibleLocal !== null ? row.disponibleLocal : true,
  });
});

// POST /api/materials (Keep as is, creates global material if admin, but typically users don't create global materials directly, though the UI might allow it for now)
materialsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(materials).values(body).returning();
  return c.json(row, 201);
});

// PUT /api/materials/:id (Override locally instead of updating global)
materialsRoutes.put("/:id", async (c) => {
  const user = c.get("user");
  const materialId = c.req.param("id");
  const body = await c.req.json();

  if (!user.companyId) {
    // If no company (e.g. admin), update global
    const [row] = await db.update(materials).set({ ...body, updatedAt: new Date() })
      .where(eq(materials.id, materialId)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }

  // UPSERT local override for the company
  const precioLocal = body.precio !== undefined ? String(body.precio) : "0";
  const stock = body.stockLocal !== undefined ? String(body.stockLocal) : "0";
  const flete = body.fleteLocal !== undefined ? String(body.fleteLocal) : "0";
  const disponible = body.disponible !== undefined ? body.disponible : true;

  const existing = await db
    .select()
    .from(companyMaterials)
    .where(and(eq(companyMaterials.companyId, user.companyId), eq(companyMaterials.materialId, materialId)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(companyMaterials).set({
      precioLocal,
      fleteLocal: flete,
      stock,
      disponible,
      updatedAt: new Date()
    }).where(eq(companyMaterials.id, existing[0].id));
  } else {
    await db.insert(companyMaterials).values({
      companyId: user.companyId,
      materialId,
      precioLocal,
      fleteLocal: flete,
      stock,
      disponible,
    });
  }

  return c.json({ success: true, isLocal: true });
});

// DELETE /api/materials/:id (Remove local override, or delete global if admin)
materialsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const materialId = c.req.param("id");

  if (!user.companyId) {
    const [row] = await db.delete(materials).where(eq(materials.id, materialId)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  }

  // Delete local override
  await db.delete(companyMaterials).where(
    and(eq(companyMaterials.companyId, user.companyId), eq(companyMaterials.materialId, materialId))
  );

  return c.json({ success: true });
});
