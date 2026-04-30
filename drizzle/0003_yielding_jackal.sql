ALTER TABLE "companies" ADD COLUMN "galeria" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "sitio_web" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "instagram" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "linkedin" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "horario_atencion" varchar(255);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "cobertura_servicio" varchar(255);