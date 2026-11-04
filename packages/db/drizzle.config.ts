import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes SQL migrations to ./drizzle from the schema.
// `pnpm db:migrate` applies them to DATABASE_URL (Neon/Supabase in production).
// Local dev without DATABASE_URL uses PGlite and migrates itself on start.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
