/**
 * Session service (PLAN.md → "Backend architecture"). Game-agnostic: it only
 * calls the game's engine from the registry, so new games need no changes here.
 *
 * The client's score is never trusted. For each submitted level the server
 * rebuilds the level from the session seed + attempt number, validates the
 * responses with the game's schema, scores them itself and runs the
 * plausibility checks.
 *
 * Every function takes `db` so tests can pass an in-memory database.
 */

import { attemptSeed, randomSeed, type LevelResult } from "@cogniarena/game-core";
import { and, asc, desc, eq, gameSessions, games, levelAttempts, max, sql, user, userGameProgress, type Db } from "@cogniarena/db";
import { games as registry } from "../registry";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message = code,
  ) {
    super(message);
  }
}

/** Assessment submissions are accepted this long past the timer, to allow for pauses. */
export const PAUSE_GRACE_MS = 30 * 60_000;
export const ASSESSMENT_MINUTES = [6, 9] as const;

function engineFor(slug: string) {
  const entry = registry[slug];
  if (!entry) throw new ApiError(404, "game-not-found");
  return entry.engine;
}

/** Makes sure the game has a row in `games`; returns it. */
export async function ensureGame(db: Db, slug: string) {
  const engine = engineFor(slug);
  const [row] = await db
    .insert(games)
    .values({ slug, name: engine.title, companyTags: engine.companyTags, version: engine.version })
    .onConflictDoUpdate({ target: games.slug, set: { name: engine.title, companyTags: engine.companyTags, version: engine.version } })
    .returning();
  return row!;
}

// ---------- Progress ----------

export async function getProgress(db: Db, userId: string, slug: string) {
  const game = await ensureGame(db, slug);
  const [row] = await db
    .select()
    .from(userGameProgress)
    .where(and(eq(userGameProgress.userId, userId), eq(userGameProgress.gameId, game.id)));
  return row ?? { userId, gameId: game.id, tutorialCompleted: false, bestScore: 0, bestLevel: 0, sessionsPlayed: 0 };
}

async function upsertProgress(db: Db, userId: string, gameId: number, set: Partial<typeof userGameProgress.$inferInsert>) {
  await db
    .insert(userGameProgress)
    .values({ userId, gameId, ...set })
    .onConflictDoUpdate({ target: [userGameProgress.userId, userGameProgress.gameId], set });
}

export async function setTutorialCompleted(db: Db, userId: string, slug: string) {
  const game = await ensureGame(db, slug);
  await upsertProgress(db, userId, game.id, { tutorialCompleted: true });
}

// ---------- Sessions ----------

export interface StartInput {
  userId: string;
  gameSlug: string;
  mode: "assessment" | "practice";
  config?: unknown;
  minutes?: number;
}

export async function startSession(db: Db, input: StartInput) {
  const engine = engineFor(input.gameSlug);
  const game = await ensureGame(db, input.gameSlug);
  if (!game.isActive) throw new ApiError(403, "game-inactive", "This game is switched off.");
  if (!engine.modes.includes(input.mode)) throw new ApiError(400, "mode-not-supported");

  let config: Record<string, unknown> = {};
  let durationMs: number | null = null;
  if (input.mode === "practice") {
    const parsed = engine.configSchema.safeParse(input.config ?? {});
    if (!parsed.success) throw new ApiError(400, "invalid-config");
    config = parsed.data as Record<string, unknown>;
  } else {
    // No tutorial gate: like the real test, the play screen opens with a short demo.
    const minutes = ASSESSMENT_MINUTES.includes(input.minutes as 6 | 9) ? input.minutes! : engine.defaultDurationSec / 60;
    durationMs = minutes * 60_000;
  }

  const [row] = await db
    .insert(gameSessions)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      gameId: game.id,
      gameVersion: engine.version,
      mode: input.mode,
      config,
      seed: randomSeed(),
      durationMs,
    })
    .returning();
  return { sessionId: row!.id, seed: row!.seed, config, durationMs };
}

async function ownedSession(db: Db, userId: string, sessionId: string) {
  const [row] = await db
    .select({ session: gameSessions, slug: games.slug })
    .from(gameSessions)
    .innerJoin(games, eq(games.id, gameSessions.gameId))
    .where(eq(gameSessions.id, sessionId));
  if (!row || row.session.userId !== userId) throw new ApiError(404, "session-not-found");
  return row;
}

export interface SubmitInput {
  userId: string;
  sessionId: string;
  attempt: number;
  responses: unknown;
  now?: Date;
}

export async function submitLevel(db: Db, input: SubmitInput) {
  const { session, slug } = await ownedSession(db, input.userId, input.sessionId);
  const engine = engineFor(slug);
  if (session.status !== "active") throw new ApiError(409, "session-finished");
  if (session.gameVersion !== engine.version) throw new ApiError(409, "game-version-changed");

  const now = input.now ?? new Date();
  if (session.durationMs !== null && now.getTime() > session.startedAt.getTime() + session.durationMs + PAUSE_GRACE_MS) {
    throw new ApiError(409, "session-expired");
  }

  const previous = await db
    .select()
    .from(levelAttempts)
    .where(eq(levelAttempts.sessionId, session.id))
    .orderBy(asc(levelAttempts.attempt));
  const lastAttempt = previous.at(-1)?.attempt ?? -1;
  // Attempts only go up (a pause restart skips a number); a repeat is a duplicate.
  if (!Number.isInteger(input.attempt) || input.attempt <= lastAttempt || input.attempt > lastAttempt + 50) {
    throw new ApiError(409, "bad-attempt");
  }

  const parsed = engine.responsesSchema.safeParse(input.responses);
  if (!parsed.success) throw new ApiError(400, "invalid-responses");

  // The server decides the level from its own history; the client can't skip ahead.
  const history = previous.map((a) => a.result as unknown as LevelResult);
  const levelNo = engine.nextLevel(history);
  const level = engine.generateLevel(attemptSeed(session.seed, input.attempt), levelNo, session.config);
  const result = engine.scoreLevel(level, parsed.data);
  const flags = engine.plausibility?.(level, parsed.data) ?? [];

  await db.insert(levelAttempts).values({
    sessionId: session.id,
    attempt: input.attempt,
    level: levelNo,
    passed: result.passed,
    points: result.points,
    avgRtMs: typeof result.avgReactionMs === "number" ? result.avgReactionMs : null,
    result: result as unknown as Record<string, unknown>,
    responses: parsed.data as unknown as Record<string, unknown>,
    flags,
  });
  if (flags.length && !session.flagged) {
    await db.update(gameSessions).set({ flagged: true }).where(eq(gameSessions.id, session.id));
  }
  return { result, flags, nextLevel: engine.nextLevel([...history, result]) };
}

export async function finishSession(db: Db, userId: string, sessionId: string) {
  const { session, slug } = await ownedSession(db, userId, sessionId);
  if (session.status === "finished") return session;

  const [totals] = await db
    .select({
      total: sql<number>`coalesce(sum(${levelAttempts.points}), 0)::int`,
      highest: max(levelAttempts.level),
    })
    .from(levelAttempts)
    .where(eq(levelAttempts.sessionId, session.id));

  const [updated] = await db
    .update(gameSessions)
    .set({ status: "finished", endedAt: new Date(), totalScore: totals!.total, finalLevel: totals!.highest ?? 0 })
    .where(eq(gameSessions.id, session.id))
    .returning();

  // Bests count only clean Assessment sessions.
  const progress = await getProgress(db, userId, slug);
  const counts = session.mode === "assessment" && !updated!.flagged;
  await upsertProgress(db, userId, session.gameId, {
    sessionsPlayed: progress.sessionsPlayed + 1,
    bestScore: counts ? Math.max(progress.bestScore, updated!.totalScore) : progress.bestScore,
    bestLevel: counts ? Math.max(progress.bestLevel, updated!.finalLevel ?? 0) : progress.bestLevel,
  });
  return updated!;
}

export async function getSessionResults(db: Db, userId: string, sessionId: string) {
  const { session, slug } = await ownedSession(db, userId, sessionId);
  const attempts = await db
    .select()
    .from(levelAttempts)
    .where(eq(levelAttempts.sessionId, session.id))
    .orderBy(asc(levelAttempts.attempt));
  return { session, slug, attempts };
}

// ---------- History & stats ----------

export async function listSessions(db: Db, userId: string, { limit = 20, offset = 0 } = {}) {
  const rows = await db
    .select({
      id: gameSessions.id,
      slug: games.slug,
      name: games.name,
      mode: gameSessions.mode,
      startedAt: gameSessions.startedAt,
      totalScore: gameSessions.totalScore,
      finalLevel: gameSessions.finalLevel,
      flagged: gameSessions.flagged,
    })
    .from(gameSessions)
    .innerJoin(games, eq(games.id, gameSessions.gameId))
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.status, "finished")))
    .orderBy(desc(gameSessions.startedAt))
    .limit(limit + 1)
    .offset(offset);
  return { sessions: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Days in a row (ending today or yesterday, UTC) with at least one finished session. */
export function streakFrom(days: string[], today = new Date()): number {
  const set = new Set(days);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!set.has(day(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (set.has(day(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getStats(db: Db, userId: string, slug: string) {
  const progress = await getProgress(db, userId, slug);
  const finished = await db
    .select({
      id: gameSessions.id,
      mode: gameSessions.mode,
      startedAt: gameSessions.startedAt,
      totalScore: gameSessions.totalScore,
      finalLevel: gameSessions.finalLevel,
      flagged: gameSessions.flagged,
    })
    .from(gameSessions)
    .where(and(eq(gameSessions.userId, userId), eq(gameSessions.gameId, progress.gameId), eq(gameSessions.status, "finished")))
    .orderBy(asc(gameSessions.startedAt));

  // Accuracy per session, for the progress chart (PLAN.md → "Scoring").
  const attempts = finished.length
    ? await db
        .select({ sessionId: levelAttempts.sessionId, result: levelAttempts.result })
        .from(levelAttempts)
        .innerJoin(gameSessions, eq(gameSessions.id, levelAttempts.sessionId))
        .where(and(eq(gameSessions.userId, userId), eq(gameSessions.gameId, progress.gameId)))
    : [];
  const bySession = new Map<string, Record<string, unknown>[]>();
  for (const a of attempts) bySession.set(a.sessionId, [...(bySession.get(a.sessionId) ?? []), a.result]);
  const ratio = (rs: Record<string, unknown>[], num: string, den: string) => {
    const d = rs.reduce((s, r) => s + (Number(r[den]) || 0), 0);
    return d ? rs.reduce((s, r) => s + (Number(r[num]) || 0), 0) / d : null;
  };

  return {
    tutorialCompleted: progress.tutorialCompleted,
    bestScore: progress.bestScore,
    bestLevel: progress.bestLevel,
    sessionsPlayed: progress.sessionsPlayed,
    lastScore: finished.at(-1)?.totalScore ?? null,
    streak: streakFrom(finished.map((s) => s.startedAt.toISOString().slice(0, 10))),
    trend: finished.map((s) => {
      const rs = bySession.get(s.id) ?? [];
      return {
        sessionId: s.id,
        date: s.startedAt.toISOString(),
        mode: s.mode,
        score: s.totalScore,
        level: s.finalLevel ?? 0,
        recallAccuracy: ratio(rs, "recallCorrect", "balls"),
        distractorAccuracy: ratio(rs, "distractorCorrect", "distractorTotal"),
      };
    }),
  };
}

// ---------- Accounts ----------

/**
 * Moves a guest's data to the account they just signed in with (called from
 * Better Auth's anonymous-plugin onLinkAccount hook, before the guest is deleted).
 */
export async function mergeUsers(db: Db, fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) return;
  await db.update(gameSessions).set({ userId: toUserId }).where(eq(gameSessions.userId, fromUserId));
  const guestRows = await db.select().from(userGameProgress).where(eq(userGameProgress.userId, fromUserId));
  for (const g of guestRows) {
    const [mine] = await db
      .select()
      .from(userGameProgress)
      .where(and(eq(userGameProgress.userId, toUserId), eq(userGameProgress.gameId, g.gameId)));
    await upsertProgress(db, toUserId, g.gameId, {
      tutorialCompleted: g.tutorialCompleted || !!mine?.tutorialCompleted,
      bestScore: Math.max(g.bestScore, mine?.bestScore ?? 0),
      bestLevel: Math.max(g.bestLevel, mine?.bestLevel ?? 0),
      sessionsPlayed: g.sessionsPlayed + (mine?.sessionsPlayed ?? 0),
    });
  }
  await db.delete(userGameProgress).where(eq(userGameProgress.userId, fromUserId));
}

/** "Delete my account and data": cascades to sessions, attempts and progress. */
export async function deleteAccount(db: Db, userId: string) {
  await db.delete(user).where(eq(user.id, userId));
}

// ---------- Admin ----------

export async function adminOverview(db: Db) {
  for (const slug of Object.keys(registry)) await ensureGame(db, slug);
  return db
    .select({
      slug: games.slug,
      name: games.name,
      isActive: games.isActive,
      sessions: sql<number>`count(${gameSessions.id})::int`,
      players: sql<number>`count(distinct ${gameSessions.userId})::int`,
    })
    .from(games)
    .leftJoin(gameSessions, eq(gameSessions.gameId, games.id))
    .groupBy(games.id)
    .orderBy(asc(games.id));
}

export async function setGameActive(db: Db, slug: string, isActive: boolean) {
  await ensureGame(db, slug);
  await db.update(games).set({ isActive }).where(eq(games.slug, slug));
}
