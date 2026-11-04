/**
 * Runs once when the server starts. With no DATABASE_URL the app uses a local
 * PGlite database; apply migrations to it before the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.DATABASE_URL) {
    const { migrateLocal } = await import("@cogniarena/db");
    await migrateLocal();
  }
}
