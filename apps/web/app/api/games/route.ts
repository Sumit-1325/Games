import { getDb } from "@cogniarena/db";
import { handle } from "@/lib/server/current-user";
import { adminOverview } from "@/lib/server/sessions";
import { games } from "@/lib/registry";

/** GET /api/games: games with metadata and whether they're switched on. */
export const GET = handle(async () => {
  const active = new Map((await adminOverview(getDb())).map((g) => [g.slug, g.isActive]));
  return Object.values(games).map(({ engine, description }) => ({
    slug: engine.slug,
    title: engine.title,
    description,
    companyTags: engine.companyTags,
    skills: engine.skills,
    modes: engine.modes,
    isActive: active.get(engine.slug) ?? true,
  }));
});
