/**
 * Seed script — loads all JSON seeders from my-app/seeders/
 * Idempotent: uses ON CONFLICT DO NOTHING
 * Run with: bun run src/db/seed.ts
 */
import { db } from "./connection.js";
import {
  familiesBcv, materials, equipments, labors,
  items, projects, chapters, apuAnalyses, apuInsumos, projectItems,
} from "./schema.js";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEEDERS_PATH = process.env.SEEDERS_PATH ? join(__dirname, "../../", process.env.SEEDERS_PATH) : join(__dirname, "../../seeders");

function readJson<T>(filename: string): T {
  const p = join(SEEDERS_PATH, filename);
  console.log(`  📂 Reading ${filename}...`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

/** Safely convert any value to a numeric string, defaulting to "0" */
function toNum(val: unknown, def = 0): string {
  const n = Number(val);
  return isNaN(n) ? String(def) : String(n);
}

async function insertBatch<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  batchSize = 100
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(table).values(batch as never).onConflictDoNothing();
    process.stdout.write(`\r    ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

// ── 1. FAMILIAS BCV ────────────────────────────────────────────────────────
async function seedFamilias() {
  console.log("\n🌱 Seeding familias_bcv...");
  const data = readJson<Array<{
    id: string; codigo: string; tipo: string; descripcion: string; referencia: string | null;
  }>>("lulo_seed_familias.json");

  await insertBatch(familiesBcv, data.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    tipo: r.tipo === "manoDeObra" ? "manoDeObra" : r.tipo,
    descripcion: r.descripcion,
    referencia: r.referencia,
  })));
  console.log(`  ✅ ${data.length} familias`);
}

// ── 2. MATERIALES ─────────────────────────────────────────────────────────
async function seedMateriales() {
  console.log("\n🌱 Seeding materials...");
  const data = readJson<Array<{
    id: string; codigo: string; familiaId: string; codigoFamilia: string;
    descripcion: string; unidad: string; precio: number; desperdicio: number;
    proveedor: string | null; consumo: number | null; importado: boolean;
    porcentajeNacional: number; fechaActualizacion: string; _codigoOriginal: string;
  }>>("lulo_seed_materiales.json");

  await insertBatch(materials, data.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    familiaId: r.familiaId,
    codigoFamilia: r.codigoFamilia,
    descripcion: r.descripcion,
    unidad: r.unidad,
    precio: toNum(r.precio),
    desperdicio: toNum(r.desperdicio),
    proveedor: r.proveedor,
    consumo: r.consumo != null ? toNum(r.consumo) : null,
    importado: r.importado,
    porcentajeNacional: toNum(r.porcentajeNacional, 100),
    fechaActualizacion: r.fechaActualizacion,
    codigoOriginal: r._codigoOriginal,
  })));
  console.log(`  ✅ ${data.length} materiales`);
}

// ── 3. EQUIPOS ───────────────────────────────────────────────────────────
async function seedEquipos() {
  console.log("\n🌱 Seeding equipments...");
  const data = readJson<Array<{
    id: string; codigo: string; familiaId: string; codigoFamilia: string;
    descripcion: string; unidad?: string; precio: number; _codigoOriginal: string;
  }>>("lulo_seed_equipos.json");

  await insertBatch(equipments, data.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    familiaId: r.familiaId,
    codigoFamilia: r.codigoFamilia,
    descripcion: r.descripcion,
    unidad: r.unidad ?? null,
    precio: toNum(r.precio),
    codigoOriginal: r._codigoOriginal,
  })));
  console.log(`  ✅ ${data.length} equipos`);
}

// ── 4. MANO DE OBRA ──────────────────────────────────────────────────────
async function seedLabors() {
  console.log("\n🌱 Seeding labors...");
  const data = readJson<Array<{
    id: string; codigo: string; familiaId: string; codigoFamilia: string;
    descripcion: string; unidad?: string; precio: number; _codigoOriginal: string;
  }>>("lulo_seed_mano_obra.json");

  await insertBatch(labors, data.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    familiaId: r.familiaId,
    codigoFamilia: r.codigoFamilia,
    descripcion: r.descripcion,
    unidad: r.unidad ?? null,
    precio: toNum(r.precio),
    codigoOriginal: r._codigoOriginal,
  })));
  console.log(`  ✅ ${data.length} mano de obra`);
}

// ── 5. PARTIDAS (ITEMS) ──────────────────────────────────────────────────
async function seedPartidas() {
  console.log("\n🌱 Seeding items (partidas)...");
  const data = readJson<Array<{
    id: string; codigo: string; descripcion: string; cobertura?: string;
    unidad: string; rendimiento: number; precioUnitario: number;
    esSubcontrato: boolean; unidadMedicion: number; _codigoOriginal: string;
  }>>("lulo_seed_partidas.json");

  await insertBatch(items, data.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    descripcion: r.descripcion,
    cobertura: r.cobertura ?? null,
    unidad: r.unidad,
    rendimiento: toNum(r.rendimiento),
    precioUnitario: toNum(r.precioUnitario),
    esSubcontrato: r.esSubcontrato,
    unidadMedicion: r.unidadMedicion,
    codigoOriginal: r._codigoOriginal,
  })));
  console.log(`  ✅ ${data.length} partidas`);
}

// ── 6. PROYECTOS ─────────────────────────────────────────────────────────
async function seedProyectos() {
  console.log("\n🌱 Seeding projects...");
  const data = readJson<Array<{
    id: string; codigo: string; descripcion: string; numeroContrato?: string;
    calculista?: string; revisor?: string; propietario?: string;
    fechaPresupuesto?: string; moneda?: object; aplicaImpuesto?: boolean;
    porcentajeImpuesto?: number; utilidadIncluyeImpuesto?: boolean;
    financiamientoConUtilidad?: boolean; costosManoObra?: object;
    costoIndirecto?: object; retenciones?: object[]; horasPorDia?: number;
    gastosMedicos?: boolean; status?: string; fechaCronograma?: string;
    finesDeSemanaTrabajo?: string; _codigoOriginal: string;
  }>>("lulo_seed_proyectos.json");

  await insertBatch(projects, data.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    descripcion: r.descripcion,
    numeroContrato: r.numeroContrato ?? null,
    calculista: r.calculista ?? null,
    revisor: r.revisor ?? null,
    propietario: r.propietario ?? null,
    fechaPresupuesto: r.fechaPresupuesto ?? null,
    moneda: r.moneda ?? null,
    aplicaImpuesto: r.aplicaImpuesto ?? false,
    porcentajeImpuesto: toNum(r.porcentajeImpuesto),
    utilidadIncluyeImpuesto: r.utilidadIncluyeImpuesto ?? false,
    financiamientoConUtilidad: r.financiamientoConUtilidad ?? false,
    costosManoObra: r.costosManoObra ?? null,
    costoIndirecto: r.costoIndirecto ?? null,
    retenciones: r.retenciones ?? null,
    horasPorDia: r.horasPorDia ?? 8,
    gastosMedicos: r.gastosMedicos ?? false,
    status: r.status ?? "N",
    fechaCronograma: r.fechaCronograma ?? null,
    finesDeSemanaTrabajo: r.finesDeSemanaTrabajo ?? null,
    codigoOriginal: r._codigoOriginal,
  })));
  console.log(`  ✅ ${data.length} proyectos`);
}

// ── 7. APU ANALYSES + INSUMOS ────────────────────────────────────────────
async function seedApu() {
  console.log("\n🌱 Seeding APU analyses + insumos (this may take a few minutes)...");
  const data = readJson<Array<{
    id: string; proyectoId: string; codigo: string; descripcion?: string;
    unidad?: string; rendimiento?: number; precioUnitario?: number;
    duracionDias?: number; horasHombre?: number; notas?: string;
    insumos: Array<{
      insumoId: string; codigoInsumo: string; codigoFamilia: string;
      tipo: string; cantidad: number; costoUnitario: number; subtotal: number;
    }>;
    _codigoOriginal: string; _codigoProyectoOriginal: string;
  }>>("lulo_seed_apu.json");

  // Insert APU headers in batches
  const apuRows = data.map((r) => ({
    id: r.id,
    projectId: r.proyectoId,
    codigo: r.codigo,
    descripcion: r.descripcion ?? null,
    unidad: r.unidad ?? null,
    rendimiento: toNum(r.rendimiento),
    precioUnitario: toNum(r.precioUnitario),
    duracionDias: toNum(r.duracionDias),
    horasHombre: toNum(r.horasHombre),
    notas: r.notas ?? null,
    codigoOriginal: r._codigoOriginal,
    codigoProyectoOriginal: r._codigoProyectoOriginal,
  }));
  await insertBatch(apuAnalyses, apuRows, 200);
  console.log(`  ✅ ${data.length} APU análisis`);

  // Insert insumos in batches
  console.log("  📦 Inserting insumos...");
  const allInsumos = data.flatMap((apu) =>
    apu.insumos.map((ins) => ({
      apuId: apu.id,
      insumoId: ins.insumoId,
      codigoInsumo: ins.codigoInsumo,
      codigoFamilia: ins.codigoFamilia,
      tipo: ins.tipo,
      cantidad: toNum(ins.cantidad),
      costoUnitario: toNum(ins.costoUnitario),
      subtotal: toNum(ins.subtotal),
    }))
  );
  await insertBatch(apuInsumos, allInsumos, 500);
  console.log(`  ✅ ${allInsumos.length} insumos APU`);
}

// ── 8. PRESUPUESTOS (CHAPTERS + PROJECT ITEMS) ───────────────────────────
async function seedPresupuestos() {
  console.log("\n🌱 Seeding presupuestos (chapters + project items)...");
  const data = readJson<Array<{
    id: string; proyectoId: string | null; codigoProyecto: string;
    capitulos: Array<{
      id: string; numero: number; descripcion: string;
      partidas: Array<{
        apuId: string | null; codigoPartida: string;
        cantidad: number; precioUnitario: number; montoTotal: number; numeroPar: number;
      }>;
      _codCapOriginal: string;
    }>;
    _codigoProyectoOriginal: string;
  }>>("lulo_seed_presupuestos.json");

  // Fallback: resolve null proyectoId from the projects seeder by matching codigoProyecto
  const proyectos = readJson<Array<{ id: string; codigo: string }>>("lulo_seed_proyectos.json");
  const codigoToId: Record<string, string> = {};
  for (const p of proyectos) codigoToId[p.codigo] = p.id;

  // Explicit override map for codes that don't match exactly
  const overrideMap: Record<string, string> = {
    "URBAN11": codigoToId["URBANISM"] ?? "",
  };

  let chapCount = 0, itemCount = 0;
  for (const presup of data) {
    // Resolve proyectoId — exact match, then explicit override
    const proyectoId: string | null =
      presup.proyectoId ??
      codigoToId[presup.codigoProyecto] ??
      overrideMap[presup.codigoProyecto] ??
      null;

    if (!proyectoId) {
      console.log(`  ⚠️  Sin proyecto para ${presup.codigoProyecto}, omitiendo`);
      continue;
    }


    const chapRows = presup.capitulos.map((c) => ({
      id: c.id,
      projectId: proyectoId as string,
      numero: c.numero,
      descripcion: c.descripcion,
      codCapOriginal: c._codCapOriginal,
    }));
    if (chapRows.length) {
      await db.insert(chapters).values(chapRows).onConflictDoNothing();
      chapCount += chapRows.length;
    }

    const itemRows = presup.capitulos.flatMap((c) =>
      c.partidas.map((p) => ({
        projectId: proyectoId,
        chapterId: c.id,
        apuId: p.apuId ?? null,
        codigoPartida: p.codigoPartida,
        numeroPar: p.numeroPar,
        cantidad: toNum(p.cantidad),
        precioUnitario: toNum(p.precioUnitario),
        montoTotal: toNum(p.montoTotal),
      }))
    );
    if (itemRows.length) {
      await insertBatch(projectItems, itemRows);
      itemCount += itemRows.length;
    }
  }
  console.log(`  ✅ ${chapCount} capítulos, ${itemCount} partidas presupuesto`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  LULOWinNG — Database Seeder");
  console.log("═══════════════════════════════════════");
  const start = Date.now();

  await seedFamilias();
  await seedMateriales();
  await seedEquipos();
  await seedLabors();
  await seedPartidas();
  await seedProyectos();
  await seedApu();
  await seedPresupuestos();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n🎉 Seed completado en ${elapsed}s`);
  console.log("═══════════════════════════════════════");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
