/**
 * Database connection.
 *
 * - DATABASE_URL set → real Postgres (Neon, Supabase, local) via postgres-js.
 *   Apply migrations with `pnpm --filter @cogniarena/db db:migrate`.
 * - No DATABASE_URL → PGlite, a full Postgres running in-process that stores its
 *   data in PGLITE_DIR (default ./.data/pglite). Good for local dev and tests;
 *   `migrateLocal()` applies migrations to it.
 *
 * The instance is cached on globalThis so Next's dev hot reload never opens the
 * same PGlite data folder twice.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Either driver; both share Drizzle's Postgres query API. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

interface Cached {
  db: Db;
  pglite: PGlite | null;
  migrated: Promise<void> | null;
}

const g = globalThis as typeof globalThis & { __cogniarenaDb?: Cached };

function migrationsFolder(): string {
  const candidates = [
    process.env.DB_MIGRATIONS_DIR,
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "../../packages/db/drizzle"),
    path.resolve(process.cwd(), "packages/db/drizzle"),
  ].filter((p): p is string => !!p);
  const found = candidates.find((p) => existsSync(path.join(p, "meta", "_journal.json")));
  if (!found) throw new Error(`Drizzle migrations not found; looked in: ${candidates.join(", ")}`);
  return found;
}

function connect(): Cached {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 5 });
    return { db: drizzlePostgres(client, { schema }), pglite: null, migrated: Promise.resolve() };
  }
  const dir = process.env.PGLITE_DIR ?? path.resolve(process.cwd(), ".data/pglite");
  mkdirSync(dir, { recursive: true });
  const pglite = new PGlite(dir);
  return { db: drizzlePglite(pglite, { schema }), pglite, migrated: null };
}

export function getDb(): Db {
  g.__cogniarenaDb ??= connect();
  return g.__cogniarenaDb.db;
}

/** Applies migrations to the local PGlite database (no-op for DATABASE_URL). */
export function migrateLocal(): Promise<void> {
  getDb();
  const cached = g.__cogniarenaDb!;
  if (!cached.pglite) return Promise.resolve();
  cached.migrated ??= migratePglite(cached.db as ReturnType<typeof drizzlePglite<typeof schema>>, {
    migrationsFolder: migrationsFolder(),
  });
  return cached.migrated;
}

/** A fresh in-memory database with migrations applied, for tests. */
export async function createTestDb(): Promise<Db> {
  const db = drizzlePglite(new PGlite(), { schema });
  await migratePglite(db, { migrationsFolder: migrationsFolder() });
  return db;
}
