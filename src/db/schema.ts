import {
  pgTable, uuid, varchar, text, boolean, integer,
  numeric, date, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  rif: varchar("rif", { length: 20 }),
  direccion: text("direccion"),
  telefono: varchar("telefono", { length: 30 }),
  email: varchar("email", { length: 100 }),
  logo: text("logo"),
  configurada: boolean("configurada").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: uuid("company_id").references(() => companies.id),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  rol: varchar("rol", { length: 20 }).notNull().default("usuario"),
  activo: boolean("activo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
// FAMILIES BCV
// ─────────────────────────────────────────────
export const familiesBcv = pgTable("families_bcv", {
  id: uuid("id").primaryKey(),
  codigo: varchar("codigo", { length: 10 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // material | equipo | manoDeObra
  descripcion: varchar("descripcion", { length: 255 }).notNull(),
  referencia: varchar("referencia", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("families_bcv_codigo_tipo_idx").on(t.codigo, t.tipo),
]);

// ─────────────────────────────────────────────
// INFLATION INDEXES
// ─────────────────────────────────────────────
export const inflationIndexes = pgTable("inflation_indexes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  familiaId: uuid("familia_id").references(() => familiesBcv.id),
  anio: integer("anio").notNull(),
  mes: integer("mes").notNull(),
  indice: numeric("indice", { precision: 15, scale: 6 }).default("1"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
// MATERIALS
// ─────────────────────────────────────────────
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  familiaId: uuid("familia_id").references(() => familiesBcv.id),
  codigoFamilia: varchar("codigo_familia", { length: 10 }),
  descripcion: text("descripcion").notNull(),
  unidad: varchar("unidad", { length: 30 }),
  precio: numeric("precio", { precision: 20, scale: 6 }).default("0"),
  desperdicio: numeric("desperdicio", { precision: 8, scale: 4 }).default("0"),
  proveedor: varchar("proveedor", { length: 255 }),
  consumo: numeric("consumo", { precision: 15, scale: 6 }),
  importado: boolean("importado").default(false),
  porcentajeNacional: numeric("porcentaje_nacional", { precision: 8, scale: 4 }).default("100"),
  fechaActualizacion: date("fecha_actualizacion"),
  codigoOriginal: varchar("codigo_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("materials_codigo_idx").on(t.codigo),
  index("materials_familia_idx").on(t.familiaId),
]);

// ─────────────────────────────────────────────
// EQUIPMENTS
// ─────────────────────────────────────────────
export const equipments = pgTable("equipments", {
  id: uuid("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  familiaId: uuid("familia_id").references(() => familiesBcv.id),
  codigoFamilia: varchar("codigo_familia", { length: 10 }),
  descripcion: text("descripcion").notNull(),
  unidad: varchar("unidad", { length: 30 }),
  precio: numeric("precio", { precision: 20, scale: 6 }).default("0"),
  codigoOriginal: varchar("codigo_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("equipments_codigo_idx").on(t.codigo),
]);

// ─────────────────────────────────────────────
// LABORS (MANO DE OBRA)
// ─────────────────────────────────────────────
export const labors = pgTable("labors", {
  id: uuid("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  familiaId: uuid("familia_id").references(() => familiesBcv.id),
  codigoFamilia: varchar("codigo_familia", { length: 10 }),
  descripcion: text("descripcion").notNull(),
  unidad: varchar("unidad", { length: 30 }),
  precio: numeric("precio", { precision: 20, scale: 6 }).default("0"),
  codigoOriginal: varchar("codigo_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("labors_codigo_idx").on(t.codigo),
]);

// ─────────────────────────────────────────────
// ITEMS (PARTIDAS MAESTRAS)
// ─────────────────────────────────────────────
export const items = pgTable("items", {
  id: uuid("id").primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  descripcion: text("descripcion").notNull(),
  cobertura: varchar("cobertura", { length: 50 }),
  unidad: varchar("unidad", { length: 20 }),
  rendimiento: numeric("rendimiento", { precision: 15, scale: 6 }).default("0"),
  precioUnitario: numeric("precio_unitario", { precision: 20, scale: 6 }).default("0"),
  esSubcontrato: boolean("es_subcontrato").default(false),
  unidadMedicion: integer("unidad_medicion").default(0),
  codigoOriginal: varchar("codigo_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("items_codigo_idx").on(t.codigo),
]);

// ─────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  codigo: varchar("codigo", { length: 20 }).notNull(),
  descripcion: text("descripcion").notNull(),
  numeroContrato: varchar("numero_contrato", { length: 50 }),
  calculista: varchar("calculista", { length: 100 }),
  revisor: varchar("revisor", { length: 100 }),
  propietario: varchar("propietario", { length: 200 }),
  fechaPresupuesto: date("fecha_presupuesto"),
  moneda: jsonb("moneda"),
  aplicaImpuesto: boolean("aplica_impuesto").default(false),
  porcentajeImpuesto: numeric("porcentaje_impuesto", { precision: 8, scale: 4 }).default("0"),
  utilidadIncluyeImpuesto: boolean("utilidad_incluye_impuesto").default(false),
  financiamientoConUtilidad: boolean("financiamiento_con_utilidad").default(false),
  costosManoObra: jsonb("costos_mano_obra"),
  costoIndirecto: jsonb("costo_indirecto"),
  retenciones: jsonb("retenciones"),
  horasPorDia: integer("horas_por_dia").default(8),
  gastosMedicos: boolean("gastos_medicos").default(false),
  status: varchar("status", { length: 1 }).default("N"),
  fechaCronograma: date("fecha_cronograma"),
  finesDeSemanaTrabajo: varchar("fines_de_semana_trabajo", { length: 2 }),
  codigoOriginal: varchar("codigo_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
// CHAPTERS (CAPÍTULOS)
// ─────────────────────────────────────────────
export const chapters = pgTable("chapters", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  descripcion: text("descripcion").notNull(),
  codCapOriginal: varchar("cod_cap_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("chapters_project_idx").on(t.projectId),
]);

// ─────────────────────────────────────────────
// APU ANALYSES
// ─────────────────────────────────────────────
export const apuAnalyses = pgTable("apu_analyses", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  codigo: varchar("codigo", { length: 20 }).notNull(),
  descripcion: text("descripcion"),
  unidad: varchar("unidad", { length: 20 }),
  rendimiento: numeric("rendimiento", { precision: 15, scale: 6 }).default("0"),
  precioUnitario: numeric("precio_unitario", { precision: 20, scale: 6 }).default("0"),
  duracionDias: numeric("duracion_dias", { precision: 10, scale: 4 }).default("0"),
  horasHombre: numeric("horas_hombre", { precision: 15, scale: 10 }).default("0"),
  notas: text("notas"),
  codigoOriginal: varchar("codigo_original", { length: 20 }),
  codigoProyectoOriginal: varchar("codigo_proyecto_original", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("apu_project_idx").on(t.projectId),
  index("apu_codigo_idx").on(t.codigo),
]);

// ─────────────────────────────────────────────
// APU INSUMOS
// ─────────────────────────────────────────────
export const apuInsumos = pgTable("apu_insumos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  apuId: uuid("apu_id").notNull().references(() => apuAnalyses.id, { onDelete: "cascade" }),
  insumoId: uuid("insumo_id").notNull(),
  codigoInsumo: varchar("codigo_insumo", { length: 20 }),
  codigoFamilia: varchar("codigo_familia", { length: 10 }),
  tipo: varchar("tipo", { length: 20 }).notNull(), // material | equipo | manoDeObra
  cantidad: numeric("cantidad", { precision: 15, scale: 6 }).default("0"),
  costoUnitario: numeric("costo_unitario", { precision: 20, scale: 6 }).default("0"),
  subtotal: numeric("subtotal", { precision: 20, scale: 6 }).default("0"),
}, (t) => [
  index("apu_insumos_apu_idx").on(t.apuId),
]);

// ─────────────────────────────────────────────
// PROJECT ITEMS (PARTIDAS EN PRESUPUESTO)
// ─────────────────────────────────────────────
export const projectItems = pgTable("project_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").references(() => chapters.id),
  apuId: uuid("apu_id").references(() => apuAnalyses.id),
  codigoPartida: varchar("codigo_partida", { length: 20 }),
  numeroPar: integer("numero_par").notNull(),
  cantidad: numeric("cantidad", { precision: 15, scale: 4 }).default("0"),
  precioUnitario: numeric("precio_unitario", { precision: 20, scale: 6 }).default("0"),
  montoTotal: numeric("monto_total", { precision: 20, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("project_items_project_idx").on(t.projectId),
  index("project_items_chapter_idx").on(t.chapterId),
]);

// ─────────────────────────────────────────────
// VALUATIONS
// ─────────────────────────────────────────────
export const valuations = pgTable("valuations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  fechaDesde: date("fecha_desde"),
  fechaHasta: date("fecha_hasta"),
  numeroAlterno: varchar("numero_alterno", { length: 50 }),
  estatus: varchar("estatus", { length: 20 }).default("borrador"),
  porcentajeIva: numeric("porcentaje_iva", { precision: 8, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const valuationDetails = pgTable("valuation_details", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  valuationId: uuid("valuation_id").notNull().references(() => valuations.id, { onDelete: "cascade" }),
  projectItemId: uuid("project_item_id").references(() => projectItems.id),
  cantidadValuada: numeric("cantidad_valuada", { precision: 15, scale: 4 }).default("0"),
  cantidadAcumulada: numeric("cantidad_acumulada", { precision: 15, scale: 4 }).default("0"),
});

// ─────────────────────────────────────────────
// MEASUREMENTS
// ─────────────────────────────────────────────
export const measurements = pgTable("measurements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  fecha: date("fecha"),
  tipo: varchar("tipo", { length: 20 }).notNull().default("medicion"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const measurementDetails = pgTable("measurement_details", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  measurementId: uuid("measurement_id").notNull().references(() => measurements.id, { onDelete: "cascade" }),
  projectItemId: uuid("project_item_id").references(() => projectItems.id),
  descripcion: varchar("descripcion", { length: 255 }),
  iguales: numeric("iguales", { precision: 8, scale: 2 }).default("1"),
  largo: numeric("largo", { precision: 15, scale: 4 }),
  ancho: numeric("ancho", { precision: 15, scale: 4 }),
  alto: numeric("alto", { precision: 15, scale: 4 }),
  total: numeric("total", { precision: 20, scale: 4 }).default("0"),
  fecha: date("fecha"),
  lugar: varchar("lugar", { length: 100 }),
  observacion: text("observacion"),
});

// ─────────────────────────────────────────────
// MEMORIAS DESCRIPTIVAS
// ─────────────────────────────────────────────
export const memorias = pgTable("memorias", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  projectItemId: uuid("project_item_id").references(() => projectItems.id),
  tipo: varchar("tipo", { length: 20 }).default("original"),
  texto: text("texto"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────
// BUDGETS AUMENTOS / DISMINUCIONES
// ─────────────────────────────────────────────
export const budgetsAumentos = pgTable("budgets_aumentos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  fecha: date("fecha"),
  titulo: varchar("titulo", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgetAumentoDetails = pgTable("budget_aumento_details", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  aumentoId: uuid("aumento_id").notNull().references(() => budgetsAumentos.id, { onDelete: "cascade" }),
  projectItemId: uuid("project_item_id").references(() => projectItems.id),
  cantidadAumento: numeric("cantidad_aumento", { precision: 15, scale: 4 }).default("0"),
});

export const budgetsDisminuciones = pgTable("budgets_disminuciones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  fecha: date("fecha"),
  titulo: varchar("titulo", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgetDisminucionDetails = pgTable("budget_disminucion_details", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  disminucionId: uuid("disminucion_id").notNull().references(() => budgetsDisminuciones.id, { onDelete: "cascade" }),
  projectItemId: uuid("project_item_id").references(() => projectItems.id),
  cantidadDisminucion: numeric("cantidad_disminucion", { precision: 15, scale: 4 }).default("0"),
});
