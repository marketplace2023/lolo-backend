import { createMiddleware } from "hono/factory";
import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

export interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  companyId: string | null;
}

export const authMiddleware = createMiddleware<{
  Variables: { user: JwtPayload };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

export const adminMiddleware = createMiddleware<{
  Variables: { user: JwtPayload };
}>(async (c, next) => {
  const user = c.get("user");
  if (user.rol !== "admin") {
    return c.json({ error: "Forbidden: admin only" }, 403);
  }
  await next();
});
