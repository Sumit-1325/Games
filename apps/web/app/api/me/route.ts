import { getDb } from "@cogniarena/db";
import { handle, requireUser } from "@/lib/server/current-user";
import { deleteAccount } from "@/lib/server/sessions";

/** DELETE /api/me: delete the account and all its data (sessions, history, progress). */
export const DELETE = handle(async (req: Request) => {
  const user = await requireUser(req);
  await deleteAccount(getDb(), user.id);
  return { ok: true };
});
