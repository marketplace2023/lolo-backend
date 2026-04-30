import { Hono } from "hono";
import { db } from "../db/connection.js";
import { companies } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

export const companiesRoutes = new Hono();
companiesRoutes.use("*", authMiddleware);

companiesRoutes.get("/", async (c) => {
  const rows = await db.select().from(companies);
  return c.json({ data: rows });
});

companiesRoutes.get("/:id", async (c) => {
  const [row] = await db.select().from(companies).where(eq(companies.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

companiesRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const allowed = [
    "nombre", "rif", "direccion", "telefono", "email", "logo", "portada", "galeria",
    "sitioWeb", "instagram", "linkedin", "horarioAtencion", "coberturaServicio",
    "descripcionPublica", "especialidades", "estadoUbicacion", "anosFundacion",
    "rncContratista", "isPublic", "rating", "totalProyectos"
  ];
  const safe = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));

  const [row] = await db.update(companies).set({ ...safe, updatedAt: new Date() })
    .where(eq(companies.id, c.req.param("id"))).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});
