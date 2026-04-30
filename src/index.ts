import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "dotenv";

import { authRoutes } from "./routes/auth.js";
import { companiesRoutes } from "./routes/companies.js";
import { projectsRoutes } from "./routes/projects.js";
import { materialsRoutes } from "./routes/materials.js";
import { equipmentsRoutes } from "./routes/equipments.js";
import { laborsRoutes } from "./routes/labors.js";
import { itemsRoutes } from "./routes/items.js";
import { familiesRoutes } from "./routes/families.js";
import { budgetsRoutes } from "./routes/budgets.js";
import { apuRoutes } from "./routes/apu.js";
import { aumentosDisminucionesRoutes } from "./routes/aumentos-disminuciones.js";
import { valuationsRoutes } from "./routes/valuations.js";
import { measurementsRoutes } from "./routes/measurements.js";
import { memoriasRoutes } from "./routes/memorias.js";
import { chaptersRoutes } from "./routes/chapters.js";
import { reportsRoutes } from "./routes/reports.js";
import { extrasRoutes } from "./routes/extras.js";
import { cierreRoutes } from "./routes/cierre.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { cronogramaRoutes } from "./routes/cronograma.js";
import { marketplaceRoutes } from "./routes/marketplace.js";
import { uploadsRoutes } from "./routes/uploads.js";
import { join } from "node:path";

config();

const app = new Hono();
const PORT = Number(process.env.PORT) || 4000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use("*", logger());

// ── Health check ───────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", version: "1.0.0" }));

// ── Uploaded assets ────────────────────────────────────────────────────────
app.get("/uploads/*", async (c) => {
  const fileName = c.req.path.replace(/^\/uploads\//, "");
  if (!fileName || fileName.includes("..")) {
    return c.json({ error: "Invalid file path" }, 400);
  }

  const file = Bun.file(join(process.cwd(), "uploads", fileName));
  if (!(await file.exists())) {
    return c.json({ error: "File not found" }, 404);
  }

  return new Response(file);
});

// ── API Routes ─────────────────────────────────────────────────────────────
const api = new Hono();
api.route("/auth", authRoutes);
api.route("/uploads", uploadsRoutes);
api.route("/companies", companiesRoutes);
api.route("/projects", projectsRoutes);
api.route("/materials", materialsRoutes);
api.route("/equipments", equipmentsRoutes);
api.route("/labors", laborsRoutes);
api.route("/items", itemsRoutes);
api.route("/families", familiesRoutes);
api.route("/budgets", budgetsRoutes);
api.route("/apu", apuRoutes);
api.route("/", marketplaceRoutes);
api.route("/", aumentosDisminucionesRoutes);
api.route("/", valuationsRoutes);
api.route("/", measurementsRoutes);
api.route("/", memoriasRoutes);
api.route("/", chaptersRoutes);
api.route("/", reportsRoutes);
api.route("/", extrasRoutes);
api.route("/", cierreRoutes);
api.route("/", dashboardRoutes);
api.route("/", cronogramaRoutes);

app.route("/api", api);

// ── 404 fallback ───────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Route not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

// ── Start server ───────────────────────────────────────────────────────────
console.log(`🚀 LULOWinNG API running on http://localhost:${PORT}`);
export default { port: PORT, fetch: app.fetch };
