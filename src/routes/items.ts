import { Hono } from "hono";
import { db } from "../db/connection.js";
import { items, apuInsumos, apuAnalyses } from "../db/schema.js";
import { eq, ilike, or, count } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { paginate, buildPaginationParams } from "../utils/response.js";

export const itemsRoutes = new Hono();
itemsRoutes.use("*", authMiddleware);

// GET /api/items
itemsRoutes.get("/", async (c) => {
  const { page, limit, offset, search } = buildPaginationParams(c.req.query() as Record<string, string>);
  const where = search ? or(ilike(items.codigo, `%${search}%`), ilike(items.descripcion, `%${search}%`)) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(items).where(where);
  const rows = await db.select({
    id: items.id, codigo: items.codigo, descripcion: items.descripcion,
    cobertura: items.cobertura, unidad: items.unidad,
    rendimiento: items.rendimiento, precioUnitario: items.precioUnitario,
    esSubcontrato: items.esSubcontrato,
  }).from(items).where(where).orderBy(items.codigo).limit(limit).offset(offset);
  return c.json(paginate(rows, Number(total), page, limit));
});

// GET /api/items/:id
itemsRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(items).where(eq(items.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// GET /api/items/:id/insumos — APU insumos from the master APU (first project found)
itemsRoutes.get("/:id/insumos", async (c) => {
  const item = await db.select({ codigo: items.codigo }).from(items).where(eq(items.id, c.req.param("id"))).limit(1);
  if (!item[0]) return c.json({ error: "Not found" }, 404);

  const [apu] = await db.select().from(apuAnalyses).where(eq(apuAnalyses.codigo, item[0].codigo)).limit(1);
  if (!apu) return c.json({ data: [] });

  const insumos = await db.select().from(apuInsumos).where(eq(apuInsumos.apuId, apu.id));
  return c.json({ data: insumos, apu });
});

// POST /api/items
itemsRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(items).values(body).returning();
  return c.json(row, 201);
});

// PUT /api/items/:id
itemsRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const [row] = await db.update(items).set({ ...body, updatedAt: new Date() })
    .where(eq(items.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /api/items/:id
itemsRoutes.delete("/:id", async (c) => {
  const [row] = await db.delete(items).where(eq(items.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
