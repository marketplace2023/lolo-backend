import { Hono } from "hono";
import { db } from "../db/connection.js";
import { labors, companyLabors } from "../db/schema.js";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { authMiddleware, JwtPayload } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const laborsRoutes = new Hono<{ Variables: { user: JwtPayload } }>();
laborsRoutes.use("*", authMiddleware);

// GET /api/labors
laborsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query());
  const familiaId = c.req.query("familiaId");
  const user = c.get("user");
  const companyId = user.companyId;

  const conditions = [];
  if (search) conditions.push(or(ilike(labors.codigo, `%${search}%`), ilike(labors.descripcion, `%${search}%`))!);
  if (familiaId) conditions.push(eq(labors.familiaId, familiaId));

  const where = conditions.length > 0
    ? conditions.reduce((acc, cond) => and(acc, cond)!)
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(labors).where(where);

  const rows = await db
    .select({
      id: labors.id,
      codigo: labors.codigo,
      descripcion: labors.descripcion,
      unidad: labors.unidad,
      precioGlobal: labors.precio,
      precioLocal: companyLabors.precioLocal,
      fcocLocal: companyLabors.fcocLocal,
      disponibleLocal: companyLabors.disponible,
      familiaId: labors.familiaId,
      codigoFamilia: labors.codigoFamilia,
    })
    .from(labors)
    .leftJoin(
      companyLabors,
      companyId
        ? and(eq(companyLabors.laborId, labors.id), eq(companyLabors.companyId, companyId))
        : eq(companyLabors.laborId, labors.id)
    )
    .where(where)
    .orderBy(labors.codigo)
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

// GET /api/labors/:id
laborsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const [row] = await db
    .select({
      id: labors.id,
      codigo: labors.codigo,
      descripcion: labors.descripcion,
      unidad: labors.unidad,
      precioGlobal: labors.precio,
      precioLocal: companyLabors.precioLocal,
      fcocLocal: companyLabors.fcocLocal,
      disponibleLocal: companyLabors.disponible,
    })
    .from(labors)
    .leftJoin(
      companyLabors,
      user.companyId
        ? and(eq(companyLabors.laborId, labors.id), eq(companyLabors.companyId, user.companyId))
        : undefined
    )
    .where(eq(labors.id, c.req.param("id")))
    .limit(1);

  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json({
    ...row,
    precio: row.precioLocal && Number(row.precioLocal) > 0 ? row.precioLocal : row.precioGlobal,
    isLocal: !!row.precioLocal && Number(row.precioLocal) > 0,
    disponible: row.disponibleLocal !== null ? row.disponibleLocal : true,
  });
});

// POST /api/labors (admin: create global)
laborsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(labors).values(body).returning();
  return c.json(row, 201);
});

// PUT /api/labors/:id — UPSERT local override for company users
laborsRoutes.put("/:id", async (c) => {
  const user = c.get("user");
  const laborId = c.req.param("id");
  const body = await c.req.json();

  if (!user.companyId) {
    // Admin: update global catalog
    const [row] = await db.update(labors).set({ ...body, updatedAt: new Date() })
      .where(eq(labors.id, laborId)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  }

  // Company user: UPSERT local override
  const precioLocal = body.precio !== undefined ? String(body.precio) : "0";
  const fcoc = body.fcocLocal !== undefined ? String(body.fcocLocal) : null;
  const disponible = body.disponible !== undefined ? body.disponible : true;

  const existing = await db
    .select()
    .from(companyLabors)
    .where(and(eq(companyLabors.companyId, user.companyId), eq(companyLabors.laborId, laborId)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(companyLabors).set({
      precioLocal,
      fcocLocal: fcoc,
      disponible,
      updatedAt: new Date()
    }).where(eq(companyLabors.id, existing[0].id));
  } else {
    await db.insert(companyLabors).values({
      companyId: user.companyId,
      laborId,
      precioLocal,
      fcocLocal: fcoc,
      disponible,
    });
  }

  return c.json({ success: true, isLocal: true });
});

// DELETE /api/labors/:id
laborsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const laborId = c.req.param("id");

  if (!user.companyId) {
    const [row] = await db.delete(labors).where(eq(labors.id, laborId)).returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  }

  // Delete local override only
  await db.delete(companyLabors).where(
    and(eq(companyLabors.companyId, user.companyId), eq(companyLabors.laborId, laborId))
  );

  return c.json({ success: true });
});
