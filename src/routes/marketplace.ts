import { Hono } from "hono";
import { db } from "../db/connection.js";
import { companies, rfqRequests, rfqBids } from "../db/schema.js";
import { eq, ilike, or, and, desc, count } from "drizzle-orm";
import { authMiddleware, JwtPayload } from "../middleware/auth.js";

export const marketplaceRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

// ── Public endpoints (no auth required) ──────────────────────────────────────

/**
 * GET /api/marketplace/contractors
 * Public directory of contractors with isPublic = true
 */
marketplaceRoutes.get("/marketplace/contractors", async (c) => {
  const search = c.req.query("search") ?? "";
  const especialidad = c.req.query("especialidad") ?? "";
  const estado = c.req.query("estado") ?? "";

  const conditions = [eq(companies.isPublic, true)];
  if (search) conditions.push(or(ilike(companies.nombre, `%${search}%`), ilike(companies.rif, `%${search}%`))!);
  if (estado) conditions.push(ilike(companies.estadoUbicacion, `%${estado}%`));

  const rows = await db.select({
    id: companies.id,
    nombre: companies.nombre,
    rif: companies.rif,
    logo: companies.logo,
    descripcionPublica: companies.descripcionPublica,
    especialidades: companies.especialidades,
    estadoUbicacion: companies.estadoUbicacion,
    anosFundacion: companies.anosFundacion,
    telefono: companies.telefono,
    email: companies.email,
    rating: companies.rating,
    totalProyectos: companies.totalProyectos,
    rncContratista: companies.rncContratista,
  })
  .from(companies)
  .where(conditions.reduce((acc, cond) => and(acc, cond)!))
  .orderBy(desc(companies.rating));

  // Filter by especialidad in JS (jsonb array filter)
  const filtered = especialidad
    ? rows.filter(r => {
        const specs = r.especialidades as string[] ?? [];
        return specs.some((s: string) => s.toLowerCase().includes(especialidad.toLowerCase()));
      })
    : rows;

  return c.json({ data: filtered, total: filtered.length });
});

/**
 * GET /api/marketplace/contractors/:id
 * Public contractor profile
 */
marketplaceRoutes.get("/marketplace/contractors/:id", async (c) => {
  const [row] = await db.select().from(companies)
    .where(and(eq(companies.id, c.req.param("id")), eq(companies.isPublic, true)))
    .limit(1);
  if (!row) return c.json({ error: "Contractor not found or not public" }, 404);
  return c.json(row);
});

// ── Authenticated endpoints ───────────────────────────────────────────────────
marketplaceRoutes.use("/marketplace/*", authMiddleware);

/**
 * GET /api/marketplace/rfq
 * List open RFQs (all authenticated users can see them)
 */
marketplaceRoutes.get("/marketplace/rfq", async (c) => {
  const rows = await db.select({
    id: rfqRequests.id,
    titulo: rfqRequests.titulo,
    descripcion: rfqRequests.descripcion,
    especialidad: rfqRequests.especialidad,
    estadoUbicacion: rfqRequests.estadoUbicacion,
    presupuestoEstimado: rfqRequests.presupuestoEstimado,
    fechaLimite: rfqRequests.fechaLimite,
    estatus: rfqRequests.estatus,
    createdAt: rfqRequests.createdAt,
    // company info
    companyId: rfqRequests.companyId,
    companyNombre: companies.nombre,
    companyEstado: companies.estadoUbicacion,
  })
  .from(rfqRequests)
  .leftJoin(companies, eq(rfqRequests.companyId, companies.id))
  .where(eq(rfqRequests.estatus, "abierta"))
  .orderBy(desc(rfqRequests.createdAt));

  return c.json({ data: rows });
});

/**
 * GET /api/marketplace/rfq/my
 * My company's RFQs (own requests)
 */
marketplaceRoutes.get("/marketplace/rfq/my", async (c) => {
  const user = c.get("user");
  if (!user.companyId) return c.json({ data: [] });

  const rows = await db.select({
    id: rfqRequests.id,
    titulo: rfqRequests.titulo,
    especialidad: rfqRequests.especialidad,
    presupuestoEstimado: rfqRequests.presupuestoEstimado,
    fechaLimite: rfqRequests.fechaLimite,
    estatus: rfqRequests.estatus,
    createdAt: rfqRequests.createdAt,
  })
  .from(rfqRequests)
  .where(eq(rfqRequests.companyId, user.companyId))
  .orderBy(desc(rfqRequests.createdAt));

  // Count bids per RFQ
  const bidCounts = await db.select({
    rfqId: rfqBids.rfqId,
    bids: count(),
  }).from(rfqBids).groupBy(rfqBids.rfqId);

  const bidMap = Object.fromEntries(bidCounts.map(b => [b.rfqId, Number(b.bids)]));
  const result = rows.map(r => ({ ...r, totalBids: bidMap[r.id] ?? 0 }));

  return c.json({ data: result });
});

/**
 * POST /api/marketplace/rfq
 * Create a new RFQ
 */
marketplaceRoutes.post("/marketplace/rfq", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const [row] = await db.insert(rfqRequests).values({
    ...body,
    companyId: user.companyId,
    estatus: "abierta",
  }).returning();
  return c.json(row, 201);
});

/**
 * PUT /api/marketplace/rfq/:id
 * Update RFQ (owner only)
 */
marketplaceRoutes.put("/marketplace/rfq/:id", async (c) => {
  const user = c.get("user");
  const rfqId = c.req.param("id");
  const body = await c.req.json();

  const [existing] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId)).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.companyId !== user.companyId) return c.json({ error: "Forbidden" }, 403);

  const [row] = await db.update(rfqRequests).set({ ...body, updatedAt: new Date() })
    .where(eq(rfqRequests.id, rfqId)).returning();
  return c.json(row);
});

/**
 * GET /api/marketplace/rfq/:id/bids
 * List bids on a specific RFQ
 */
marketplaceRoutes.get("/marketplace/rfq/:id/bids", async (c) => {
  const rfqId = c.req.param("id");
  const rows = await db.select({
    id: rfqBids.id,
    montoPropuesto: rfqBids.montoPropuesto,
    plazosDias: rfqBids.plazosDias,
    notasTecnicas: rfqBids.notasTecnicas,
    estatus: rfqBids.estatus,
    createdAt: rfqBids.createdAt,
    biddingCompanyId: rfqBids.biddingCompanyId,
    companyNombre: companies.nombre,
    companyEstado: companies.estadoUbicacion,
    companyRating: companies.rating,
    companyEspecialidades: companies.especialidades,
  })
  .from(rfqBids)
  .leftJoin(companies, eq(rfqBids.biddingCompanyId, companies.id))
  .where(eq(rfqBids.rfqId, rfqId))
  .orderBy(rfqBids.montoPropuesto);

  return c.json({ data: rows });
});

/**
 * POST /api/marketplace/rfq/:id/bids
 * Submit a bid on an RFQ
 */
marketplaceRoutes.post("/marketplace/rfq/:id/bids", async (c) => {
  const user = c.get("user");
  if (!user.companyId) return c.json({ error: "Must belong to a company to bid" }, 400);

  const rfqId = c.req.param("id");
  const body = await c.req.json();

  // Prevent self-bidding
  const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId)).limit(1);
  if (!rfq) return c.json({ error: "RFQ not found" }, 404);
  if (rfq.companyId === user.companyId) return c.json({ error: "Cannot bid on your own RFQ" }, 400);
  if (rfq.estatus !== "abierta") return c.json({ error: "RFQ is not open" }, 400);

  const [row] = await db.insert(rfqBids).values({
    rfqId,
    biddingCompanyId: user.companyId,
    ...body,
    estatus: "enviada",
  }).returning();

  return c.json(row, 201);
});

/**
 * PUT /api/marketplace/rfq/:id/bids/:bidId
 * Accept or reject a bid (RFQ owner only)
 */
marketplaceRoutes.put("/marketplace/rfq/:id/bids/:bidId", async (c) => {
  const user = c.get("user");
  const { id: rfqId, bidId } = c.req.param();
  const body = await c.req.json() as { estatus: "aceptada" | "rechazada" };

  const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId)).limit(1);
  if (!rfq || rfq.companyId !== user.companyId) return c.json({ error: "Forbidden" }, 403);

  const [bid] = await db.update(rfqBids).set({ estatus: body.estatus, updatedAt: new Date() })
    .where(eq(rfqBids.id, bidId)).returning();

  // If accepted, close the RFQ
  if (body.estatus === "aceptada") {
    await db.update(rfqRequests).set({ estatus: "adjudicada", updatedAt: new Date() })
      .where(eq(rfqRequests.id, rfqId));
  }

  return c.json(bid);
});

/**
 * PATCH /api/marketplace/profile
 * Update own company's public marketplace profile
 */
marketplaceRoutes.patch("/marketplace/profile", async (c) => {
  const user = c.get("user");
  if (!user.companyId) return c.json({ error: "No company" }, 400);

  const body = await c.req.json();
  const allowed = [
    "descripcionPublica", "especialidades", "estadoUbicacion",
    "anosFundacion", "rncContratista", "isPublic", "telefono", "email", "logo"
  ];
  const safe = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const [row] = await db.update(companies).set({ ...safe, updatedAt: new Date() })
    .where(eq(companies.id, user.companyId)).returning();

  return c.json(row);
});
