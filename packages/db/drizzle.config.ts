import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

// Automatically load .env if present (root, db package, or web app)
for (const envPath of [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../apps/web/.env.local"),
  path.resolve(process.cwd(), "../apps/web/.env.local"),
]) {
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {}
  }
}

// `pnpm db:generate` writes SQL migrations to ./drizzle from the schema.
// `pnpm db:migrate` applies them to DATABASE_URL (Neon/Supabase in production).
// Local dev without DATABASE_URL uses PGlite and migrates itself on start.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
