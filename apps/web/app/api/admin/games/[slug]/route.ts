import { z } from "zod";
import { getDb } from "@cogniarena/db";
import { handle, requireAdmin } from "@/lib/server/current-user";
import { setGameActive } from "@/lib/server/sessions";

const body = z.object({ isActive: z.boolean() });

/** PATCH /api/admin/games/:slug: switch a game on or off (admin only). */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  await requireAdmin(req);
  await setGameActive(getDb(), (await ctx.params).slug, body.parse(await req.json()).isActive);
  return { ok: true };
});
