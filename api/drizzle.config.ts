import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "./.env" });

console.log("DATABASE_URL:", process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/database/schema/index.ts",

  out: "./drizzle",

  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  verbose: true,

  strict: true,
});
