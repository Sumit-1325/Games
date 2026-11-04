import { z } from "zod";
import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { startSession } from "@/lib/server/sessions";

const body = z.object({
  gameSlug: z.string().min(1).max(64),
  mode: z.enum(["assessment", "practice"]),
  config: z.record(z.string(), z.unknown()).optional(),
  minutes: z.number().int().optional(),
});

/** POST /api/sessions: start a session → { sessionId, seed, config, durationMs }. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  return startSession(getDb(), { userId: user.id, ...body.parse(await req.json()) });
});
