import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/connection.js";
import { users, companies } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

export const authRoutes = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
});

const setupSchema = z.object({
  company: z.object({
    nombre: z.string().min(2),
    rif: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email().optional(),
  }),
  admin: z.object({
    nombre: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

// POST /api/auth/login
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.activo) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const token = jwt.sign(
    { sub: user.id, email: user.email, rol: user.rol, companyId: user.companyId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return c.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, companyId: user.companyId } });
});

// POST /api/auth/register
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { name, email, password, companyName } = c.req.valid("json");

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let companyId: string | null = null;

  if (companyName?.trim()) {
    const [company] = await db.insert(companies).values({
      nombre: companyName.trim(),
      configurada: true,
    }).returning();
    companyId = company.id;
  }

  const [newUser] = await db.insert(users).values({
    companyId,
    nombre: name,
    email,
    passwordHash,
    rol: "admin",
  }).returning();

  const token = jwt.sign(
    { sub: newUser.id, email: newUser.email, rol: newUser.rol, companyId: newUser.companyId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return c.json({ token, user: { id: newUser.id, nombre: newUser.nombre, email: newUser.email, rol: newUser.rol, companyId: newUser.companyId } }, 201);
});

// GET /api/auth/setup-status — checks if initial setup is needed
authRoutes.get("/setup-status", async (c) => {
  const [company] = await db.select().from(companies).limit(1);
  return c.json({ setupRequired: !company?.configurada });
});

// POST /api/auth/setup — initial company + admin setup
authRoutes.post("/setup", zValidator("json", setupSchema), async (c) => {
  const { company: companyData, admin } = c.req.valid("json");

  const [existing] = await db.select().from(companies).limit(1);
  if (existing?.configurada) {
    return c.json({ error: "System already configured" }, 400);
  }

  const passwordHash = await bcrypt.hash(admin.password, 12);

  const [newCompany] = await db.insert(companies).values({
    nombre: companyData.nombre,
    rif: companyData.rif,
    direccion: companyData.direccion,
    telefono: companyData.telefono,
    email: companyData.email,
    configurada: true,
  }).returning();

  const [newUser] = await db.insert(users).values({
    companyId: newCompany.id,
    nombre: admin.nombre,
    email: admin.email,
    passwordHash,
    rol: "admin",
  }).returning();

  const token = jwt.sign(
    { sub: newUser.id, email: newUser.email, rol: newUser.rol, companyId: newUser.companyId },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  return c.json({ token, user: { id: newUser.id, nombre: newUser.nombre, email: newUser.email, rol: newUser.rol, companyId: newUser.companyId }, company: newCompany }, 201);
});

// GET /api/auth/me
authRoutes.get("/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!) as { sub: string };
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({ id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, companyId: user.companyId });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
