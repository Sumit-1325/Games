import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { ApiError, getStats } from "@/lib/server/sessions";

/** GET /api/me/stats?game=: best score, best level, streak, accuracy trend. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const game = new URL(req.url).searchParams.get("game");
  if (!game) throw new ApiError(400, "game-required");
  return getStats(getDb(), user.id, game);
});
