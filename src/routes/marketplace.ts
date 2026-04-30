import { Hono } from "hono";
import { db } from "../db/connection.js";
import { companies, marketplaceListings, rfqRequests, rfqBids } from "../db/schema.js";
import { eq, ilike, or, and, desc, count } from "drizzle-orm";
import { JwtPayload } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

export const marketplaceRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

type MarketplaceOfferType = "product" | "service";

function requireUser(c: Parameters<typeof marketplaceRoutes.get>[1] extends never ? never : any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    return jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildMarketplaceOffer(row: {
  id: string;
  titulo: string;
  categoria: string;
  tipo: string;
  descripcion: string;
  precio: string;
  moneda: string;
  stock: number | null;
  sku: string | null;
  imagenes: unknown;
  companyId: string;
  companyNombre: string;
  companyEstado: string | null;
  companyRating: string | null;
  updatedAt: Date | null;
}) {
  const images = Array.isArray(row.imagenes)
    ? row.imagenes.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : [];

  return {
    id: row.id,
    sourceId: row.id,
    sourceType: "listing" as const,
    title: row.titulo,
    description: row.descripcion,
    sku: row.sku?.trim() || `LIST-${row.id.slice(0, 8).toUpperCase()}`,
    category: row.categoria,
    type: row.tipo as MarketplaceOfferType,
    seller: row.companyNombre,
    sellerId: row.companyId,
    sellerRating: toNumber(row.companyRating),
    rating: toNumber(row.companyRating),
    reviews: 0,
    price: toNumber(row.precio),
    currency: row.moneda,
    stock: row.tipo === "product" ? row.stock : null,
    unit: null,
    location: row.companyEstado,
    image: images[0] ?? null,
    images,
    updatedAt: row.updatedAt,
  };
}

async function listMarketplaceOffers(params: {
  search?: string;
  category?: string;
  type?: string;
}) {
  const conditions = [eq(marketplaceListings.estatus, "published")];

  if (params.search) {
    conditions.push(
      or(
        ilike(marketplaceListings.titulo, `%${params.search}%`),
        ilike(marketplaceListings.descripcion, `%${params.search}%`),
        ilike(marketplaceListings.categoria, `%${params.search}%`),
        ilike(marketplaceListings.sku, `%${params.search}%`),
        ilike(companies.nombre, `%${params.search}%`)
      )!
    );
  }

  if (params.category) {
    conditions.push(ilike(marketplaceListings.categoria, params.category));
  }

  if (params.type === "product" || params.type === "service") {
    conditions.push(eq(marketplaceListings.tipo, params.type));
  }

  const rows = await db.select({
    id: marketplaceListings.id,
    titulo: marketplaceListings.titulo,
    categoria: marketplaceListings.categoria,
    tipo: marketplaceListings.tipo,
    descripcion: marketplaceListings.descripcion,
    precio: marketplaceListings.precio,
    moneda: marketplaceListings.moneda,
    stock: marketplaceListings.stock,
    sku: marketplaceListings.sku,
    imagenes: marketplaceListings.imagenes,
    updatedAt: marketplaceListings.updatedAt,
    companyId: companies.id,
    companyNombre: companies.nombre,
    companyEstado: companies.estadoUbicacion,
    companyRating: companies.rating,
  })
    .from(marketplaceListings)
    .innerJoin(companies, eq(marketplaceListings.companyId, companies.id))
    .where(conditions.reduce((acc, condition) => and(acc, condition)!))
    .orderBy(desc(marketplaceListings.updatedAt), desc(marketplaceListings.createdAt));

  return rows.map(buildMarketplaceOffer);
}

async function getMarketplaceOfferById(id: string) {
  const [row] = await db.select({
    id: marketplaceListings.id,
    titulo: marketplaceListings.titulo,
    categoria: marketplaceListings.categoria,
    tipo: marketplaceListings.tipo,
    descripcion: marketplaceListings.descripcion,
    precio: marketplaceListings.precio,
    moneda: marketplaceListings.moneda,
    stock: marketplaceListings.stock,
    sku: marketplaceListings.sku,
    imagenes: marketplaceListings.imagenes,
    updatedAt: marketplaceListings.updatedAt,
    companyId: companies.id,
    companyNombre: companies.nombre,
    companyEstado: companies.estadoUbicacion,
    companyRating: companies.rating,
  })
    .from(marketplaceListings)
    .innerJoin(companies, eq(marketplaceListings.companyId, companies.id))
    .where(and(eq(marketplaceListings.id, id), eq(marketplaceListings.estatus, "published")))
    .limit(1);

  return row ? buildMarketplaceOffer(row) : null;
}

// Public endpoints
marketplaceRoutes.get("/marketplace/offers", async (c) => {
  const search = c.req.query("search")?.trim();
  const category = c.req.query("category")?.trim();
  const type = c.req.query("type")?.trim();
  const featured = c.req.query("featured") === "true";
  const limitParam = Number(c.req.query("limit") ?? 0);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  let offers = await listMarketplaceOffers({ search, category, type });

  if (featured) {
    offers = offers.slice().sort((a, b) => b.price - a.price || b.sellerRating - a.sellerRating);
  }

  const finalData = limit ? offers.slice(0, limit) : offers;
  return c.json({ data: finalData, total: offers.length });
});

marketplaceRoutes.get("/marketplace/offers/:id", async (c) => {
  const offer = await getMarketplaceOfferById(c.req.param("id"));
  if (!offer) return c.json({ error: "Offer not found" }, 404);
  return c.json(offer);
});

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
    .where(conditions.reduce((acc, condition) => and(acc, condition)!))
    .orderBy(desc(companies.rating));

  const filtered = especialidad
    ? rows.filter((row) => {
        const specs = row.especialidades as string[] ?? [];
        return specs.some((spec) => spec.toLowerCase().includes(especialidad.toLowerCase()));
      })
    : rows;

  return c.json({ data: filtered, total: filtered.length });
});

marketplaceRoutes.get("/marketplace/contractors/:id", async (c) => {
  const contractorId = c.req.param("id");
  const [row] = await db.select({
    id: companies.id,
    nombre: companies.nombre,
    rif: companies.rif,
    direccion: companies.direccion,
    telefono: companies.telefono,
    email: companies.email,
    logo: companies.logo,
    portada: companies.portada,
    galeria: companies.galeria,
    sitioWeb: companies.sitioWeb,
    instagram: companies.instagram,
    linkedin: companies.linkedin,
    horarioAtencion: companies.horarioAtencion,
    coberturaServicio: companies.coberturaServicio,
    descripcionPublica: companies.descripcionPublica,
    especialidades: companies.especialidades,
    estadoUbicacion: companies.estadoUbicacion,
    anosFundacion: companies.anosFundacion,
    rncContratista: companies.rncContratista,
    isPublic: companies.isPublic,
    rating: companies.rating,
    totalProyectos: companies.totalProyectos,
  }).from(companies)
    .where(and(eq(companies.id, contractorId), eq(companies.isPublic, true)))
    .limit(1);
  if (!row) return c.json({ error: "Contractor not found or not public" }, 404);

  const listingsRows = await db.select({
    id: marketplaceListings.id,
    titulo: marketplaceListings.titulo,
    categoria: marketplaceListings.categoria,
    tipo: marketplaceListings.tipo,
    descripcion: marketplaceListings.descripcion,
    precio: marketplaceListings.precio,
    moneda: marketplaceListings.moneda,
    stock: marketplaceListings.stock,
    sku: marketplaceListings.sku,
    imagenes: marketplaceListings.imagenes,
    updatedAt: marketplaceListings.updatedAt,
    companyId: companies.id,
    companyNombre: companies.nombre,
    companyEstado: companies.estadoUbicacion,
    companyRating: companies.rating,
  })
    .from(marketplaceListings)
    .innerJoin(companies, eq(marketplaceListings.companyId, companies.id))
    .where(and(eq(marketplaceListings.companyId, contractorId), eq(marketplaceListings.estatus, "published")))
    .orderBy(desc(marketplaceListings.updatedAt), desc(marketplaceListings.createdAt));

  return c.json({
    ...row,
    listings: listingsRows.map(buildMarketplaceOffer),
  });
});

// Authenticated endpoints
marketplaceRoutes.post("/marketplace/offers", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  if (!user.companyId) return c.json({ error: "Must belong to a company to create a listing" }, 400);

  const body = await c.req.json() as {
    title?: string;
    category?: string;
    type?: MarketplaceOfferType;
    description?: string;
    price?: number | string;
    currency?: string;
    stock?: number | null;
    sku?: string | null;
    images?: string[];
  };

  if (!body.title?.trim() || !body.category?.trim() || !body.description?.trim()) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  if (body.type !== "product" && body.type !== "service") {
    return c.json({ error: "Invalid listing type" }, 400);
  }

  const price = toNumber(body.price);
  if (price <= 0) return c.json({ error: "Price must be greater than zero" }, 400);

  const images = Array.isArray(body.images)
    ? body.images.map((image) => image.trim()).filter(Boolean).slice(0, 5)
    : [];

  const [row] = await db.insert(marketplaceListings).values({
    companyId: user.companyId,
    titulo: body.title.trim(),
    categoria: body.category.trim(),
    tipo: body.type,
    descripcion: body.description.trim(),
    precio: String(price),
    moneda: (body.currency?.trim() || "USD").toUpperCase(),
    stock: body.type === "product" ? Number(body.stock ?? 0) : null,
    sku: body.sku?.trim() || null,
    imagenes: images,
    estatus: "published",
  }).returning({ id: marketplaceListings.id });

  const offer = await getMarketplaceOfferById(row.id);
  return c.json(offer, 201);
});

marketplaceRoutes.get("/marketplace/offers/my", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  if (!user.companyId) return c.json({ data: [] });

  const rows = await db.select({
    id: marketplaceListings.id,
    titulo: marketplaceListings.titulo,
    categoria: marketplaceListings.categoria,
    tipo: marketplaceListings.tipo,
    descripcion: marketplaceListings.descripcion,
    precio: marketplaceListings.precio,
    moneda: marketplaceListings.moneda,
    stock: marketplaceListings.stock,
    sku: marketplaceListings.sku,
    imagenes: marketplaceListings.imagenes,
    updatedAt: marketplaceListings.updatedAt,
    companyId: companies.id,
    companyNombre: companies.nombre,
    companyEstado: companies.estadoUbicacion,
    companyRating: companies.rating,
  })
    .from(marketplaceListings)
    .innerJoin(companies, eq(marketplaceListings.companyId, companies.id))
    .where(eq(marketplaceListings.companyId, user.companyId))
    .orderBy(desc(marketplaceListings.updatedAt), desc(marketplaceListings.createdAt));

  return c.json({ data: rows.map(buildMarketplaceOffer) });
});

marketplaceRoutes.get("/marketplace/reviews/my", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  if (!user.companyId) {
    return c.json({
      data: [],
      summary: {
        averageRating: 0,
        total: 0,
        positive: 0,
        breakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })),
      },
    });
  }

  return c.json({
    data: [],
    summary: {
      averageRating: 0,
      total: 0,
      positive: 0,
      breakdown: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })),
    },
  });
});

marketplaceRoutes.get("/marketplace/rfq", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
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

marketplaceRoutes.get("/marketplace/rfq/my", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
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

  const bidCounts = await db.select({
    rfqId: rfqBids.rfqId,
    bids: count(),
  }).from(rfqBids).groupBy(rfqBids.rfqId);

  const bidMap = Object.fromEntries(bidCounts.map((bid) => [bid.rfqId, Number(bid.bids)]));
  return c.json({ data: rows.map((row) => ({ ...row, totalBids: bidMap[row.id] ?? 0 })) });
});

marketplaceRoutes.post("/marketplace/rfq", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  const body = await c.req.json();
  const [row] = await db.insert(rfqRequests).values({
    ...body,
    companyId: user.companyId,
    estatus: "abierta",
  }).returning();
  return c.json(row, 201);
});

marketplaceRoutes.put("/marketplace/rfq/:id", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  const rfqId = c.req.param("id");
  const body = await c.req.json();

  const [existing] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId)).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.companyId !== user.companyId) return c.json({ error: "Forbidden" }, 403);

  const [row] = await db.update(rfqRequests).set({ ...body, updatedAt: new Date() })
    .where(eq(rfqRequests.id, rfqId)).returning();
  return c.json(row);
});

marketplaceRoutes.get("/marketplace/rfq/:id/bids", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
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

marketplaceRoutes.post("/marketplace/rfq/:id/bids", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  if (!user.companyId) return c.json({ error: "Must belong to a company to bid" }, 400);

  const rfqId = c.req.param("id");
  const body = await c.req.json();

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

marketplaceRoutes.put("/marketplace/rfq/:id/bids/:bidId", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  const { id: rfqId, bidId } = c.req.param();
  const body = await c.req.json() as { estatus: "aceptada" | "rechazada" };

  const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId)).limit(1);
  if (!rfq || rfq.companyId !== user.companyId) return c.json({ error: "Forbidden" }, 403);

  const [bid] = await db.update(rfqBids).set({ estatus: body.estatus, updatedAt: new Date() })
    .where(eq(rfqBids.id, bidId)).returning();

  if (body.estatus === "aceptada") {
    await db.update(rfqRequests).set({ estatus: "adjudicada", updatedAt: new Date() })
      .where(eq(rfqRequests.id, rfqId));
  }

  return c.json(bid);
});

marketplaceRoutes.patch("/marketplace/profile", async (c) => {
  const auth = requireUser(c);
  if (auth instanceof Response) return auth;
  const user = auth;
  if (!user.companyId) return c.json({ error: "No company" }, 400);

  const body = await c.req.json();
  const allowed = [
    "descripcionPublica", "especialidades", "estadoUbicacion",
    "anosFundacion", "rncContratista", "isPublic", "telefono", "email", "logo"
  ];
  const safe = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));

  const [row] = await db.update(companies).set({ ...safe, updatedAt: new Date() })
    .where(eq(companies.id, user.companyId)).returning();

  return c.json(row);
});
