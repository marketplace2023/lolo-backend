import { Hono } from "hono";
import { db } from "../db/connection.js";
import { apuAnalyses, apuInsumos, materials, equipments, labors, items } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const apuRoutes = new Hono();
apuRoutes.use("*", authMiddleware);

// GET /api/apu/by-item/:itemId
apuRoutes.get("/by-item/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const [item] = await db.select({ codigo: items.codigo }).from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) return c.json({ error: "Item not found" }, 404);

  const [apu] = await db.select().from(apuAnalyses).where(eq(apuAnalyses.codigo, item.codigo)).limit(1);
  if (!apu) return c.json({ apu: null, insumos: { materiales: [], equipos: [], manoDeObra: [] } });

  const insumos = await db.select().from(apuInsumos).where(eq(apuInsumos.apuId, apu.id));

  // Separate by type and fetch details
  const materialsIds = insumos.filter(i => i.tipo === "material").map(i => i.insumoId);
  const equipmentsIds = insumos.filter(i => i.tipo === "equipo").map(i => i.insumoId);
  const laborsIds = insumos.filter(i => i.tipo === "manoDeObra").map(i => i.insumoId);

  const mats = materialsIds.length > 0 ? await db.select().from(materials).where(inArray(materials.id, materialsIds)) : [];
  const eqps = equipmentsIds.length > 0 ? await db.select().from(equipments).where(inArray(equipments.id, equipmentsIds)) : [];
  const labs = laborsIds.length > 0 ? await db.select().from(labors).where(inArray(labors.id, laborsIds)) : [];

  const matMap = new Map(mats.map(m => [m.id, m]));
  const eqpMap = new Map(eqps.map(e => [e.id, e]));
  const labMap = new Map(labs.map(l => [l.id, l]));

  const enrichedInsumos = insumos.map(ins => {
    let detail = null;
    if (ins.tipo === "material") detail = matMap.get(ins.insumoId);
    else if (ins.tipo === "equipo") detail = eqpMap.get(ins.insumoId);
    else if (ins.tipo === "manoDeObra") detail = labMap.get(ins.insumoId);

    return {
      ...ins,
      descripcion: detail?.descripcion,
      unidad: detail?.unidad,
    };
  });

  return c.json({
    apu,
    insumos: {
      materiales: enrichedInsumos.filter(i => i.tipo === "material"),
      equipos: enrichedInsumos.filter(i => i.tipo === "equipo"),
      manoDeObra: enrichedInsumos.filter(i => i.tipo === "manoDeObra"),
    }
  });
});

// POST /api/apu/:id/insumos
apuRoutes.post("/:id/insumos", async (c) => {
  const apuId = c.req.param("id");
  const body = await c.req.json();
  const { insumoId, tipo, cantidad } = body;

  let costoUnitario = 0;
  let codigoInsumo = "";
  let codigoFamilia = "";

  if (tipo === "material") {
    const [m] = await db.select().from(materials).where(eq(materials.id, insumoId)).limit(1);
    if (m) { costoUnitario = Number(m.precio); codigoInsumo = m.codigo; codigoFamilia = m.codigoFamilia || ""; }
  } else if (tipo === "equipo") {
    const [e] = await db.select().from(equipments).where(eq(equipments.id, insumoId)).limit(1);
    if (e) { costoUnitario = Number(e.precio); codigoInsumo = e.codigo; codigoFamilia = e.codigoFamilia || ""; }
  } else if (tipo === "manoDeObra") {
    const [l] = await db.select().from(labors).where(eq(labors.id, insumoId)).limit(1);
    if (l) { costoUnitario = Number(l.precio); codigoInsumo = l.codigo; codigoFamilia = l.codigoFamilia || ""; }
  }

  // Calculate subtotal
  const [apu] = await db.select({ rendimiento: apuAnalyses.rendimiento }).from(apuAnalyses).where(eq(apuAnalyses.id, apuId)).limit(1);
  const rendimiento = Number(apu?.rendimiento || 1);
  const qty = Number(cantidad);
  
  let subtotal = 0;
  if (tipo === "material") {
    subtotal = qty * costoUnitario;
  } else {
    subtotal = rendimiento > 0 ? (qty * costoUnitario) / rendimiento : 0;
  }

  const [row] = await db.insert(apuInsumos).values({
    apuId,
    insumoId,
    tipo,
    codigoInsumo,
    codigoFamilia,
    cantidad: String(qty),
    costoUnitario: String(costoUnitario),
    subtotal: String(subtotal)
  }).returning();

  return c.json(row, 201);
});

// PUT /api/apu/insumos/:insumoId
apuRoutes.put("/insumos/:insumoId", async (c) => {
  const insumoId = c.req.param("insumoId");
  const { cantidad } = await c.req.json();
  
  const [ins] = await db.select().from(apuInsumos).where(eq(apuInsumos.id, insumoId)).limit(1);
  if (!ins) return c.json({ error: "Insumo not found" }, 404);

  const [apu] = await db.select({ rendimiento: apuAnalyses.rendimiento }).from(apuAnalyses).where(eq(apuAnalyses.id, ins.apuId)).limit(1);
  const rendimiento = Number(apu?.rendimiento || 1);
  const qty = Number(cantidad);
  const costo = Number(ins.costoUnitario);

  let subtotal = 0;
  if (ins.tipo === "material") {
    subtotal = qty * costo;
  } else {
    subtotal = rendimiento > 0 ? (qty * costo) / rendimiento : 0;
  }

  const [updated] = await db.update(apuInsumos).set({
    cantidad: String(qty),
    subtotal: String(subtotal)
  }).where(eq(apuInsumos.id, insumoId)).returning();

  return c.json(updated);
});

// DELETE /api/apu/insumos/:insumoId
apuRoutes.delete("/insumos/:insumoId", async (c) => {
  const insumoId = c.req.param("insumoId");
  await db.delete(apuInsumos).where(eq(apuInsumos.id, insumoId));
  return c.json({ success: true });
});

// POST /api/apu/:id/recalculate
apuRoutes.post("/:id/recalculate", async (c) => {
  const apuId = c.req.param("id");
  const [apu] = await db.select().from(apuAnalyses).where(eq(apuAnalyses.id, apuId)).limit(1);
  if (!apu) return c.json({ error: "APU not found" }, 404);

  const insumos = await db.select().from(apuInsumos).where(eq(apuInsumos.apuId, apuId));
  const rendimiento = Number(apu.rendimiento) || 1;

  let totalEquipos = 0;
  let totalMateriales = 0;
  let totalManoObra = 0;

  // Actualizar costos de cada insumo desde los catálogos maestros
  for (const ins of insumos) {
    let costoUnitario = Number(ins.costoUnitario);
    let qty = Number(ins.cantidad);
    
    // Fetch latest price
    if (ins.tipo === "material") {
      const [m] = await db.select({ precio: materials.precio }).from(materials).where(eq(materials.id, ins.insumoId)).limit(1);
      if (m) costoUnitario = Number(m.precio);
    } else if (ins.tipo === "equipo") {
      const [e] = await db.select({ precio: equipments.precio }).from(equipments).where(eq(equipments.id, ins.insumoId)).limit(1);
      if (e) costoUnitario = Number(e.precio);
    } else if (ins.tipo === "manoDeObra") {
      const [l] = await db.select({ precio: labors.precio }).from(labors).where(eq(labors.id, ins.insumoId)).limit(1);
      if (l) costoUnitario = Number(l.precio);
    }

    let subtotal = 0;
    if (ins.tipo === "material") {
      subtotal = qty * costoUnitario;
      totalMateriales += subtotal;
    } else {
      subtotal = rendimiento > 0 ? (qty * costoUnitario) / rendimiento : 0;
      if (ins.tipo === "equipo") totalEquipos += subtotal;
      else if (ins.tipo === "manoDeObra") totalManoObra += subtotal;
    }

    // Update the row with new price and subtotal
    await db.update(apuInsumos).set({
      costoUnitario: String(costoUnitario),
      subtotal: String(subtotal)
    }).where(eq(apuInsumos.id, ins.id));
  }

  const precioUnitario = totalEquipos + totalMateriales + totalManoObra;

  // Update APU
  await db.update(apuAnalyses).set({
    precioUnitario: String(precioUnitario),
    updatedAt: new Date(),
  }).where(eq(apuAnalyses.id, apuId));

  // Also update the Item master if applicable (syncing master prices)
  await db.update(items).set({
    precioUnitario: String(precioUnitario),
    updatedAt: new Date(),
  }).where(eq(items.codigo, apu.codigo));

  return c.json({
    success: true,
    totalEquipos,
    totalMateriales,
    totalManoObra,
    precioUnitario
  });
});
