import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { listSessions } from "@/lib/server/sessions";

/** GET /api/me/sessions?offset=: finished sessions, newest first, 20 per page. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const offset = Math.max(0, Number(new URL(req.url).searchParams.get("offset")) || 0);
  return listSessions(getDb(), user.id, { offset });
});
