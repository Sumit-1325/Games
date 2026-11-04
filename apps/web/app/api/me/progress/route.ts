import { z } from "zod";
import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { getProgress, setTutorialCompleted } from "@/lib/server/sessions";

const body = z.object({ game: z.string().min(1).max(64), tutorialCompleted: z.literal(true) });

/** PATCH /api/me/progress: mark the tutorial practice round as passed. */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser(req);
  const { game } = body.parse(await req.json());
  await setTutorialCompleted(getDb(), user.id, game);
  return getProgress(getDb(), user.id, game);
});
