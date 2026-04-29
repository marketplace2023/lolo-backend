import { Hono } from "hono";
import { db } from "../db/connection.js";
import { equipments, companyEquipments } from "../db/schema.js";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { authMiddleware, JwtPayload } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const equipmentsRoutes = new Hono<{ Variables: { user: JwtPayload } }>();
equipmentsRoutes.use("*", authMiddleware);

// GET /api/equipments
equipmentsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query());
  const familiaId = c.req.query("familiaId");
  const user = c.get("user");
  const companyId = user.companyId;

  const conditions = [];
  if (search) conditions.push(or(ilike(equipments.codigo, `%${search}%`), ilike(equipments.descripcion, `%${search}%`))!);
  if (familiaId) conditions.push(eq(equipments.familiaId, familiaId));

  const where = conditions.length > 0
    ? conditions.reduce((acc, cond) => and(acc, cond)!)
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(equipments).where(where);

  const rows = await db
    .select({
      id: equipments.id,
      codigo: equipments.codigo,
      descripcion: equipments.descripcion,
      unidad: equipments.unidad,
      precioGlobal: equipments.precio,
      precioLocal: companyEquipments.precioLocal,
      depreciacionLocal: companyEquipments.depreciacionLocal,
      disponibleLocal: companyEquipments.disponible,
      familiaId: equipments.familiaId,
      codigoFamilia: equipments.codigoFamilia,
    })
    .from(equipments)
    .leftJoin(
      companyEquipments,
      companyId
        ? and(eq(companyEquipments.equipmentId, equipments.id), eq(companyEquipments.companyId, companyId))
        : eq(companyEquipments.equipmentId, equipments.id)
    )
    .where(where)
    .orderBy(equipments.codigo)
    .limit(limit)
    .offset(offset);

  const finalRows = rows.map(r => ({
    ...r,
    precio: r.precioLocal && Number(r.precioLocal) > 0 ? r.precioLocal : r.precioGlobal,
    isLocal: !!r.precioLocal && Number(r.precioLocal) > 0,
    disponible: r.disponibleLocal !== null ? r.disponibleLocal : true,
  }));

  return c.json(paginate(finalRows, Number(total), page, limit));
});

// GET /api/equipments/:id
equipmentsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const [row] = await db
    .select({
      id: equipments.id,
      codigo: equipments.codigo,
      descripcion: equipments.descripcion,
      unidad: equipments.unidad,
      precioGlobal: equipments.precio,
      precioLocal: companyEquipments.precioLocal,
      depreciacionLocal: companyEquipments.depreciacionLocal,
      disponibleLocal: companyEquipments.disponible,
    })
    .from(equipments)
    .leftJoin(
      companyEquipments,
      user.companyId
        ? and(eq(companyEquipments.equipmentId, equipments.id), eq(companyEquipments.companyId, user.companyId))
        : undefined
    )
    .where(eq(equipments.id, c.req.param("id")))
    .limit(1);

  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json({
    ...row,
    precio: row.precioLocal && Number(row.precioLocal) > 0 ? row.precioLocal : row.precioGlobal,
    isLocal: !!row.precioLocal && Number(row.precioLocal) > 0,
    disponible: row.disponibleLocal !== null ? row.disponibleLocal : true,
  });
});

// POST /api/equipments (admin: create global)
equipmentsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(equipments).values(body).returning();
  return c.json(row, 201);
});

// PUT /api/equipments/:id — UPSERT local override for company users
equipmentsRoutes.put("/:id", async (c) => {
  const user = c.get("user");
  const equipmentId = c.req.param("id");
  const body = await c.req.json();

  if (!user.companyId) {
    // Admin: update global catalog
    const [row] = await db.update(equipments).set({ ...body, updatedAt: new Date() })
      .where(eq(equipments.id, equipmentId)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }

  // Company user: UPSERT local override
  const precioLocal = body.precio !== undefined ? String(body.precio) : "0";
  const depreciacion = body.depreciacionLocal !== undefined ? String(body.depreciacionLocal) : null;
  const disponible = body.disponible !== undefined ? body.disponible : true;

  const existing = await db
    .select()
    .from(companyEquipments)
    .where(and(eq(companyEquipments.companyId, user.companyId), eq(companyEquipments.equipmentId, equipmentId)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(companyEquipments).set({
      precioLocal,
      depreciacionLocal: depreciacion,
      disponible,
      updatedAt: new Date()
    }).where(eq(companyEquipments.id, existing[0].id));
  } else {
    await db.insert(companyEquipments).values({
      companyId: user.companyId,
      equipmentId,
      precioLocal,
      depreciacionLocal: depreciacion,
      disponible,
    });
  }

  return c.json({ success: true, isLocal: true });
});

// DELETE /api/equipments/:id
equipmentsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const equipmentId = c.req.param("id");

  if (!user.companyId) {
    const [row] = await db.delete(equipments).where(eq(equipments.id, equipmentId)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  }

  // Delete local override only
  await db.delete(companyEquipments).where(
    and(eq(companyEquipments.companyId, user.companyId), eq(companyEquipments.equipmentId, equipmentId))
  );

  return c.json({ success: true });
});
