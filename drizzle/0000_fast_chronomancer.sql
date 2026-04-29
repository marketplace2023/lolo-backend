CREATE TABLE "apu_analyses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"descripcion" text,
	"unidad" varchar(20),
	"rendimiento" numeric(15, 6) DEFAULT '0',
	"precio_unitario" numeric(20, 6) DEFAULT '0',
	"duracion_dias" numeric(10, 4) DEFAULT '0',
	"horas_hombre" numeric(15, 10) DEFAULT '0',
	"notas" text,
	"codigo_original" varchar(20),
	"codigo_proyecto_original" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "apu_insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apu_id" uuid NOT NULL,
	"insumo_id" uuid NOT NULL,
	"codigo_insumo" varchar(20),
	"codigo_familia" varchar(10),
	"tipo" varchar(20) NOT NULL,
	"cantidad" numeric(15, 6) DEFAULT '0',
	"costo_unitario" numeric(20, 6) DEFAULT '0',
	"subtotal" numeric(20, 6) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "budget_aumento_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aumento_id" uuid NOT NULL,
	"project_item_id" uuid,
	"cantidad_aumento" numeric(15, 4) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "budget_disminucion_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disminucion_id" uuid NOT NULL,
	"project_item_id" uuid,
	"cantidad_disminucion" numeric(15, 4) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "budgets_aumentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha" date,
	"titulo" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "budgets_disminuciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha" date,
	"titulo" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"descripcion" text NOT NULL,
	"cod_cap_original" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"rif" varchar(20),
	"direccion" text,
	"telefono" varchar(30),
	"email" varchar(100),
	"logo" text,
	"configurada" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"familia_id" uuid,
	"codigo_familia" varchar(10),
	"descripcion" text NOT NULL,
	"unidad" varchar(30),
	"precio" numeric(20, 6) DEFAULT '0',
	"codigo_original" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "equipments_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "families_bcv" (
	"id" uuid PRIMARY KEY NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"descripcion" varchar(255) NOT NULL,
	"referencia" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inflation_indexes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"familia_id" uuid,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"indice" numeric(15, 6) DEFAULT '1',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"descripcion" text NOT NULL,
	"cobertura" varchar(50),
	"unidad" varchar(20),
	"rendimiento" numeric(15, 6) DEFAULT '0',
	"precio_unitario" numeric(20, 6) DEFAULT '0',
	"es_subcontrato" boolean DEFAULT false,
	"unidad_medicion" integer DEFAULT 0,
	"codigo_original" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "items_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "labors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"familia_id" uuid,
	"codigo_familia" varchar(10),
	"descripcion" text NOT NULL,
	"unidad" varchar(30),
	"precio" numeric(20, 6) DEFAULT '0',
	"codigo_original" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "labors_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"familia_id" uuid,
	"codigo_familia" varchar(10),
	"descripcion" text NOT NULL,
	"unidad" varchar(30),
	"precio" numeric(20, 6) DEFAULT '0',
	"desperdicio" numeric(8, 4) DEFAULT '0',
	"proveedor" varchar(255),
	"consumo" numeric(15, 6),
	"importado" boolean DEFAULT false,
	"porcentaje_nacional" numeric(8, 4) DEFAULT '100',
	"fecha_actualizacion" date,
	"codigo_original" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "materials_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "measurement_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_id" uuid NOT NULL,
	"project_item_id" uuid,
	"descripcion" varchar(255),
	"iguales" numeric(8, 2) DEFAULT '1',
	"largo" numeric(15, 4),
	"ancho" numeric(15, 4),
	"alto" numeric(15, 4),
	"total" numeric(20, 4) DEFAULT '0',
	"fecha" date,
	"lugar" varchar(100),
	"observacion" text
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha" date,
	"tipo" varchar(20) DEFAULT 'medicion' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_item_id" uuid,
	"tipo" varchar(20) DEFAULT 'original',
	"texto" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_extra_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"apu_id" uuid,
	"codigo_partida" varchar(20) NOT NULL,
	"descripcion" text NOT NULL,
	"unidad" varchar(20),
	"cantidad" numeric(15, 4) DEFAULT '0',
	"precio_unitario" numeric(20, 6) DEFAULT '0',
	"monto_total" numeric(20, 4) DEFAULT '0',
	"motivo" text,
	"fecha_aprobacion" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"chapter_id" uuid,
	"apu_id" uuid,
	"codigo_partida" varchar(20),
	"numero_par" integer NOT NULL,
	"cantidad" numeric(15, 4) DEFAULT '0',
	"precio_unitario" numeric(20, 6) DEFAULT '0',
	"monto_total" numeric(20, 4) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"codigo" varchar(20) NOT NULL,
	"descripcion" text NOT NULL,
	"numero_contrato" varchar(50),
	"calculista" varchar(100),
	"revisor" varchar(100),
	"propietario" varchar(200),
	"fecha_presupuesto" date,
	"moneda" jsonb,
	"aplica_impuesto" boolean DEFAULT false,
	"porcentaje_impuesto" numeric(8, 4) DEFAULT '0',
	"utilidad_incluye_impuesto" boolean DEFAULT false,
	"financiamiento_con_utilidad" boolean DEFAULT false,
	"costos_mano_obra" jsonb,
	"costo_indirecto" jsonb,
	"retenciones" jsonb,
	"horas_por_dia" integer DEFAULT 8,
	"gastos_medicos" boolean DEFAULT false,
	"status" varchar(1) DEFAULT 'N',
	"fecha_cronograma" date,
	"fines_de_semana_trabajo" varchar(2),
	"codigo_original" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"nombre" varchar(100) NOT NULL,
	"email" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"rol" varchar(20) DEFAULT 'usuario' NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "valuation_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"valuation_id" uuid NOT NULL,
	"project_item_id" uuid,
	"cantidad_valuada" numeric(15, 4) DEFAULT '0',
	"cantidad_acumulada" numeric(15, 4) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"fecha_desde" date,
	"fecha_hasta" date,
	"numero_alterno" varchar(50),
	"estatus" varchar(20) DEFAULT 'borrador',
	"porcentaje_iva" numeric(8, 4) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "apu_analyses" ADD CONSTRAINT "apu_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apu_insumos" ADD CONSTRAINT "apu_insumos_apu_id_apu_analyses_id_fk" FOREIGN KEY ("apu_id") REFERENCES "public"."apu_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_aumento_details" ADD CONSTRAINT "budget_aumento_details_aumento_id_budgets_aumentos_id_fk" FOREIGN KEY ("aumento_id") REFERENCES "public"."budgets_aumentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_aumento_details" ADD CONSTRAINT "budget_aumento_details_project_item_id_project_items_id_fk" FOREIGN KEY ("project_item_id") REFERENCES "public"."project_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_disminucion_details" ADD CONSTRAINT "budget_disminucion_details_disminucion_id_budgets_disminuciones_id_fk" FOREIGN KEY ("disminucion_id") REFERENCES "public"."budgets_disminuciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_disminucion_details" ADD CONSTRAINT "budget_disminucion_details_project_item_id_project_items_id_fk" FOREIGN KEY ("project_item_id") REFERENCES "public"."project_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets_aumentos" ADD CONSTRAINT "budgets_aumentos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets_disminuciones" ADD CONSTRAINT "budgets_disminuciones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_familia_id_families_bcv_id_fk" FOREIGN KEY ("familia_id") REFERENCES "public"."families_bcv"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inflation_indexes" ADD CONSTRAINT "inflation_indexes_familia_id_families_bcv_id_fk" FOREIGN KEY ("familia_id") REFERENCES "public"."families_bcv"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labors" ADD CONSTRAINT "labors_familia_id_families_bcv_id_fk" FOREIGN KEY ("familia_id") REFERENCES "public"."families_bcv"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_familia_id_families_bcv_id_fk" FOREIGN KEY ("familia_id") REFERENCES "public"."families_bcv"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_details" ADD CONSTRAINT "measurement_details_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_details" ADD CONSTRAINT "measurement_details_project_item_id_project_items_id_fk" FOREIGN KEY ("project_item_id") REFERENCES "public"."project_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorias" ADD CONSTRAINT "memorias_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorias" ADD CONSTRAINT "memorias_project_item_id_project_items_id_fk" FOREIGN KEY ("project_item_id") REFERENCES "public"."project_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_extra_items" ADD CONSTRAINT "project_extra_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_extra_items" ADD CONSTRAINT "project_extra_items_apu_id_apu_analyses_id_fk" FOREIGN KEY ("apu_id") REFERENCES "public"."apu_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_apu_id_apu_analyses_id_fk" FOREIGN KEY ("apu_id") REFERENCES "public"."apu_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuation_details" ADD CONSTRAINT "valuation_details_valuation_id_valuations_id_fk" FOREIGN KEY ("valuation_id") REFERENCES "public"."valuations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuation_details" ADD CONSTRAINT "valuation_details_project_item_id_project_items_id_fk" FOREIGN KEY ("project_item_id") REFERENCES "public"."project_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apu_project_idx" ON "apu_analyses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "apu_codigo_idx" ON "apu_analyses" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "apu_insumos_apu_idx" ON "apu_insumos" USING btree ("apu_id");--> statement-breakpoint
CREATE INDEX "chapters_project_idx" ON "chapters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "equipments_codigo_idx" ON "equipments" USING btree ("codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "families_bcv_codigo_tipo_idx" ON "families_bcv" USING btree ("codigo","tipo");--> statement-breakpoint
CREATE INDEX "items_codigo_idx" ON "items" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "labors_codigo_idx" ON "labors" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "materials_codigo_idx" ON "materials" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "materials_familia_idx" ON "materials" USING btree ("familia_id");--> statement-breakpoint
CREATE INDEX "extra_items_project_idx" ON "project_extra_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_items_project_idx" ON "project_items" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_items_chapter_idx" ON "project_items" USING btree ("chapter_id");