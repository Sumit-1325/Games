import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { getSessionResults } from "@/lib/server/sessions";

/** GET /api/sessions/:id: results page data (owner only). */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  const { session, slug, attempts } = await getSessionResults(getDb(), user.id, (await ctx.params).id);
  // Never expose the seed of a session that's still running.
  const { seed, ...rest } = session;
  return { session: session.status === "finished" ? { ...rest, seed } : rest, slug, attempts };
});
