import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { finishSession } from "@/lib/server/sessions";

/** POST /api/sessions/:id/finish: close the session, compute totals, update bests. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  const s = await finishSession(getDb(), user.id, (await ctx.params).id);
  return { sessionId: s.id, totalScore: s.totalScore, finalLevel: s.finalLevel, flagged: s.flagged };
});
