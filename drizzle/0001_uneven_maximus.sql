CREATE TABLE "company_equipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"precio_local" numeric(20, 6) DEFAULT '0',
	"depreciacion_local" numeric(15, 6),
	"disponible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_labors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"labor_id" uuid NOT NULL,
	"precio_local" numeric(20, 6) DEFAULT '0',
	"fcoc_local" numeric(15, 6),
	"disponible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"precio_local" numeric(20, 6) DEFAULT '0',
	"flete_local" numeric(20, 6) DEFAULT '0',
	"disponible" boolean DEFAULT true,
	"stock" numeric(15, 4) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "company_equipments" ADD CONSTRAINT "company_equipments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_equipments" ADD CONSTRAINT "company_equipments_equipment_id_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_labors" ADD CONSTRAINT "company_labors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_labors" ADD CONSTRAINT "company_labors_labor_id_labors_id_fk" FOREIGN KEY ("labor_id") REFERENCES "public"."labors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_materials" ADD CONSTRAINT "company_materials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_materials" ADD CONSTRAINT "company_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_equipments_unique" ON "company_equipments" USING btree ("company_id","equipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_labors_unique" ON "company_labors" USING btree ("company_id","labor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_materials_unique" ON "company_materials" USING btree ("company_id","material_id");