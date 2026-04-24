import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL!;

// Connection pool for queries
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// Migration client (single connection)
export const migrationClient = postgres(connectionString, { max: 1 });
