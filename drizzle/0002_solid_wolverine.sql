CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"categoria" varchar(120) NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"descripcion" text NOT NULL,
	"precio" numeric(20, 2) NOT NULL,
	"moneda" varchar(10) DEFAULT 'USD' NOT NULL,
	"stock" integer,
	"sku" varchar(60),
	"imagenes" jsonb DEFAULT '[]'::jsonb,
	"estatus" varchar(20) DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfq_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"bidding_company_id" uuid NOT NULL,
	"monto_propuesto" numeric(20, 2),
	"plazos_dias" integer,
	"notas_tecnicas" text,
	"estatus" varchar(20) DEFAULT 'enviada',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfq_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"especialidad" varchar(100),
	"estado_ubicacion" varchar(50),
	"presupuesto_estimado" numeric(20, 2),
	"fecha_limite" date,
	"estatus" varchar(20) DEFAULT 'abierta',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "descripcion_publica" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "especialidades" jsonb;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "estado_ubicacion" varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "anos_fundacion" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "rnc_contratista" varchar(20);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "rating" numeric(3, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "total_proyectos" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "project_items" ADD COLUMN "fecha_inicio_partida" date;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD CONSTRAINT "rfq_bids_rfq_id_rfq_requests_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfq_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_bids" ADD CONSTRAINT "rfq_bids_bidding_company_id_companies_id_fk" FOREIGN KEY ("bidding_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_requests" ADD CONSTRAINT "rfq_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketplace_listings_company_idx" ON "marketplace_listings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "marketplace_listings_status_idx" ON "marketplace_listings" USING btree ("estatus");--> statement-breakpoint
CREATE INDEX "marketplace_listings_type_idx" ON "marketplace_listings" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_bids_unique" ON "rfq_bids" USING btree ("rfq_id","bidding_company_id");--> statement-breakpoint
CREATE INDEX "rfq_company_idx" ON "rfq_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "rfq_estatus_idx" ON "rfq_requests" USING btree ("estatus");