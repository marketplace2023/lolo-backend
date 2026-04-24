import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrationClient } from "./connection.js";

const db = drizzle(migrationClient);

console.log("🔄 Running migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✅ Migrations complete");

await migrationClient.end();
