import { db } from "./src/db/connection.js";
import { users, companies } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function run() {
  try {
    const allUsers = await db.select().from(users);
    console.log("Current users:", allUsers);

    if (allUsers.length === 0) {
      console.log("No users found. Creating one...");
      
      let [company] = await db.select().from(companies).limit(1);
      if (!company) {
         [company] = await db.insert(companies).values({
             nombre: "Constructora Lulo",
             email: "admin@constructoralulo.com",
             configurada: true
         }).returning();
         console.log("Created company:", company);
      }

      const passwordHash = await bcrypt.hash("admin123", 12);
      const [newUser] = await db.insert(users).values({
        companyId: company.id,
        nombre: "Admin",
        email: "admin@constructoralulo.com",
        passwordHash,
        rol: "admin",
        activo: true
      }).returning();
      console.log("Created user:", newUser);
    } else {
        console.log("Users exist, updating password for the first one or admin@constructoralulo.com");
        const passwordHash = await bcrypt.hash("admin123", 12);
        
        const adminUser = allUsers.find(u => u.email === "admin@constructoralulo.com") || allUsers[0];
        
        await db.update(users).set({ passwordHash }).where(eq(users.id, adminUser.id));
        console.log(`Password reset to admin123 for ${adminUser.email}`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
