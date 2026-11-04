import { beforeEach, describe, expect, it } from "vitest";
import { attemptSeed } from "@cogniarena/game-core";
import { createTestDb, user, type Db } from "@cogniarena/db";
import { generateLevel, type GridRecallResponses } from "@cogniarena/grid-recall";
import {
  ApiError,
  PAUSE_GRACE_MS,
  finishSession,
  getSessionResults,
  getStats,
  listSessions,
  mergeUsers,
  setTutorialCompleted,
  startSession,
  streakFrom,
  submitLevel,
} from "./sessions";

let db: Db;

async function addUser(id: string) {
  await db.insert(user).values({ id, name: id, email: `${id}@test.local` });
}

/** Perfect answers for a level the server will generate. */
function perfect(seed: string, attempt: number, level: number, config = {}): GridRecallResponses {
  const l = generateLevel(attemptSeed(seed, attempt), level, config);
  return {
    taps: l.sequence,
    answers: l.tasks.map((t) => t.answer),
    reactionTimesMs: l.tasks.map(() => 800),
    recallTimeMs: 10_000,
  };
}

const rejects = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toBeInstanceOf(ApiError);
  await expect(p).rejects.toMatchObject({ code });
};

beforeEach(async () => {
  db = await createTestDb();
  await addUser("u1");
  await addUser("u2");
});

describe("session API service", () => {
  it("assessment starts straight away, with the chosen length", async () => {
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "assessment", minutes: 9 });
    expect(s.durationMs).toBe(9 * 60_000);
    const d = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "assessment" });
    expect(d.durationMs).toBe(6 * 60_000);
  });

  it("practice validates the custom grid", async () => {
    await rejects(startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "practice", config: { rows: 20 } }), "invalid-config");
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "practice", config: { rows: 3, cols: 4 } });
    expect(s.config).toEqual({ rows: 3, cols: 4 });
    expect(s.durationMs).toBeNull();
  });

  it("scores on the server, levels up, and finishes with totals and bests", async () => {
    await setTutorialCompleted(db, "u1", "grid-recall");
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "assessment" });
    const r1 = await submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 1, responses: perfect(s.seed, 1, 1) });
    expect(r1.result.passed).toBe(true);
    expect(r1.nextLevel).toBe(2);
    const r2 = await submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 2, responses: perfect(s.seed, 2, 2) });
    expect(r2.result.level).toBe(2);

    const done = await finishSession(db, "u1", s.sessionId);
    expect(done.totalScore).toBe(r1.result.points + r2.result.points);
    expect(done.finalLevel).toBe(2);
    const stats = await getStats(db, "u1", "grid-recall");
    expect(stats).toMatchObject({ bestScore: done.totalScore, bestLevel: 2, sessionsPlayed: 1, streak: 1 });
    expect(stats.trend[0]!.recallAccuracy).toBe(1);
    expect((await listSessions(db, "u1")).sessions).toHaveLength(1);
    expect((await getSessionResults(db, "u1", s.sessionId)).attempts).toHaveLength(2);
  });

  it("ignores the client's idea of the level: answers for the wrong level fail", async () => {
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "practice" });
    // Client pretends to be on level 5; the server plays level 1.
    const r = await submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 1, responses: perfect(s.seed, 1, 5) });
    expect(r.result.level).toBe(1);
    expect(r.result.passed).toBe(false);
  });

  it("rejects duplicate attempts, other users, expired and finished sessions", async () => {
    await setTutorialCompleted(db, "u1", "grid-recall");
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "assessment" });
    await submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 1, responses: perfect(s.seed, 1, 1) });
    await rejects(submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 1, responses: perfect(s.seed, 1, 1) }), "bad-attempt");
    await rejects(submitLevel(db, { userId: "u2", sessionId: s.sessionId, attempt: 2, responses: {} }), "session-not-found");
    const late = new Date(Date.now() + 6 * 60_000 + PAUSE_GRACE_MS + 1000);
    await rejects(submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 2, responses: perfect(s.seed, 2, 2), now: late }), "session-expired");
    await finishSession(db, "u1", s.sessionId);
    await rejects(submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 3, responses: perfect(s.seed, 3, 2) }), "session-finished");
  });

  it("flags inhuman reaction times and leaves flagged sessions out of bests", async () => {
    await setTutorialCompleted(db, "u1", "grid-recall");
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "assessment" });
    const fast = { ...perfect(s.seed, 1, 1), reactionTimesMs: [20, 20, 20] };
    const r = await submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 1, responses: fast });
    expect(r.flags).toContain("too-fast-reaction");
    const done = await finishSession(db, "u1", s.sessionId);
    expect(done.flagged).toBe(true);
    expect((await getStats(db, "u1", "grid-recall")).bestScore).toBe(0);
  });

  it("rejects malformed responses", async () => {
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "practice" });
    await rejects(submitLevel(db, { userId: "u1", sessionId: s.sessionId, attempt: 1, responses: { taps: "nope" } }), "invalid-responses");
  });

  it("moves a guest's sessions and progress to their new account", async () => {
    await setTutorialCompleted(db, "u1", "grid-recall");
    const s = await startSession(db, { userId: "u1", gameSlug: "grid-recall", mode: "practice" });
    await finishSession(db, "u1", s.sessionId);
    await mergeUsers(db, "u1", "u2");
    const stats = await getStats(db, "u2", "grid-recall");
    expect(stats.tutorialCompleted).toBe(true);
    expect(stats.sessionsPlayed).toBe(1);
    expect((await listSessions(db, "u2")).sessions).toHaveLength(1);
    expect((await listSessions(db, "u1")).sessions).toHaveLength(0);
  });
});

describe("streakFrom", () => {
  const today = new Date("2026-11-04T10:00:00Z");
  it("counts consecutive days ending today or yesterday", () => {
    expect(streakFrom(["2026-11-04", "2026-11-03", "2026-11-01"], today)).toBe(2);
    expect(streakFrom(["2026-11-03", "2026-11-02"], today)).toBe(2);
    expect(streakFrom(["2026-11-01"], today)).toBe(0);
  });
});
