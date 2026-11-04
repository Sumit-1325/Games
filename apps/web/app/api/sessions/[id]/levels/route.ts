import { z } from "zod";
import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { submitLevel } from "@/lib/server/sessions";

const body = z.object({ attempt: z.number().int().min(0), responses: z.unknown() });

/** POST /api/sessions/:id/levels: submit one level; the server re-scores it. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  const { attempt, responses } = body.parse(await req.json());
  return submitLevel(getDb(), { userId: user.id, sessionId: (await ctx.params).id, attempt, responses });
});
