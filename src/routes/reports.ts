import { Hono } from "hono";
import { db } from "../db/connection.js";
import { projects, chapters, projectItems, apuAnalyses, apuInsumos, materials, equipments, labors } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const reportsRoutes = new Hono();
reportsRoutes.use("*", authMiddleware);

// GET /api/projects/:id/reports/apu
reportsRoutes.get("/projects/:id/reports/apu", async (c) => {
  const projectId = c.req.param("id");

  // 1. Fetch Project Info
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return c.json({ error: "Project not found" }, 404);

  // 2. Fetch all chapters and items
  const capRows = await db.select().from(chapters).where(eq(chapters.projectId, projectId)).orderBy(chapters.numero);
  const itemsRows = await db.select().from(projectItems).where(eq(projectItems.projectId, projectId)).orderBy(projectItems.numeroPar);

  // 3. Collect APU IDs needed
  const apuIds = Array.from(new Set(itemsRows.map(i => i.apuId).filter(Boolean))) as string[];

  let apusWithInsumos: any[] = [];

  if (apuIds.length > 0) {
    // 4. Fetch the APU Headers
    const apusRows = await db.select().from(apuAnalyses).where(inArray(apuAnalyses.id, apuIds));

    // 5. Fetch all insumos for these APUs
    const insumosRows = await db.select().from(apuInsumos).where(inArray(apuInsumos.apuId, apuIds));

    // 6. Enrich insumos with master data
    // Optimizing by fetching all referenced master data
    const matIds = insumosRows.filter(i => i.tipo === 'material').map(i => i.insumoId);
    const eqIds = insumosRows.filter(i => i.tipo === 'equipo').map(i => i.insumoId);
    const labIds = insumosRows.filter(i => i.tipo === 'manoDeObra').map(i => i.insumoId);

    const masterMats = matIds.length > 0 ? await db.select().from(materials).where(inArray(materials.id, matIds)) : [];
    const masterEqs = eqIds.length > 0 ? await db.select().from(equipments).where(inArray(equipments.id, eqIds)) : [];
    const masterLabs = labIds.length > 0 ? await db.select().from(labors).where(inArray(labors.id, labIds)) : [];

    const matMap = Object.fromEntries(masterMats.map(m => [m.id, m]));
    const eqMap = Object.fromEntries(masterEqs.map(e => [e.id, e]));
    const labMap = Object.fromEntries(masterLabs.map(l => [l.id, l]));

    // 7. Group insumos back into APUs
    apusWithInsumos = apusRows.map(apu => {
      const insumos = insumosRows.filter(i => i.apuId === apu.id).map(ins => {
        let master = null;
        if (ins.tipo === 'material') master = matMap[ins.insumoId];
        else if (ins.tipo === 'equipo') master = eqMap[ins.insumoId];
        else if (ins.tipo === 'manoDeObra') master = labMap[ins.insumoId];

        return {
          ...ins,
          descripcion: master?.descripcion,
          unidad: master?.unidad,
        };
      });

      return {
        ...apu,
        materiales: insumos.filter(i => i.tipo === 'material'),
        equipos: insumos.filter(i => i.tipo === 'equipo'),
        manoDeObra: insumos.filter(i => i.tipo === 'manoDeObra'),
      };
    });
  }

  // 8. Assemble Full Report payload
  const result = {
    project,
    chapters: capRows.map(cap => ({
      ...cap,
      partidas: itemsRows.filter(i => i.chapterId === cap.id)
    })),
    apus: Object.fromEntries(apusWithInsumos.map(a => [a.id, a]))
  };

  return c.json(result);
});
