export * as schema from "./schema";
export * from "./schema";
export { createTestDb, getDb, migrateLocal, type Db } from "./client";
// Query helpers, re-exported so apps use the same drizzle-orm instance as the schema.
export { and, asc, count, desc, eq, gt, inArray, max, sql } from "drizzle-orm";
