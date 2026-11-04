import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, FEEDBACK_MS, createSession, reduce, remainingMs, summarise, type SessionState } from "./machine";

const start = () => reduce(createSession({ seed: "m", durationMs: 60_000 }), { type: "START", now: 0 });

/** Plays the current level perfectly, answering each question 300 ms after it shows. */
function playPerfectLevel(state: SessionState, from: number): { state: SessionState; now: number } {
  let s = state;
  let now = from;
  for (;;) {
    const p = s.phase;
    if (p.name === "countdown" || p.name === "blink") {
      now = p.endsAt;
      s = reduce(s, { type: "TICK", now });
    } else if (p.name === "distractor") {
      now = p.shownAt + 300;
      s = reduce(s, { type: "ANSWER", answer: s.level.tasks[p.index]!.answer, now });
    } else if (p.name === "recall") {
      for (const cell of s.level.sequence) s = reduce(s, { type: "TAP", cell });
      now += 1000;
      return { state: reduce(s, { type: "SUBMIT", now }), now };
    } else throw new Error(`unexpected phase ${p.name}`);
  }
}

describe("session machine", () => {
  it("runs countdown → blink → distractor … → recall → feedback", () => {
    let s = start();
    expect(s.phase.name).toBe("countdown");
    s = reduce(s, { type: "TICK", now: COUNTDOWN_MS - 1 });
    expect(s.phase.name).toBe("countdown");
    s = reduce(s, { type: "TICK", now: COUNTDOWN_MS });
    expect(s.phase).toMatchObject({ name: "blink", index: 0 });
    s = reduce(s, { type: "TICK", now: COUNTDOWN_MS + s.level.timings.blinkMs });
    expect(s.phase).toMatchObject({ name: "distractor", index: 0 });
  });

  it("a perfect level passes and the next level is level 2 with a new sequence", () => {
    const { state, now } = playPerfectLevel(start(), 0);
    expect(state.phase.name).toBe("feedback");
    expect(state.history[0]).toMatchObject({ level: 1, passed: true });
    const level1 = state.level.sequence;
    const next = reduce(state, { type: "TICK", now: now + FEEDBACK_MS });
    expect(next.phase.name).toBe("countdown");
    expect(next.level.level).toBe(2);
    expect(next.level.sequence).not.toEqual(level1);
  });

  it("records a timed-out question as null", () => {
    let s = reduce(start(), { type: "TICK", now: COUNTDOWN_MS });
    const blinkEnd = COUNTDOWN_MS + s.level.timings.blinkMs;
    s = reduce(s, { type: "TICK", now: blinkEnd + s.level.timings.distractorMs });
    expect(s.answers).toEqual([null]);
    expect(s.phase).toMatchObject({ name: "blink", index: 1 });
  });

  it("passes several deadlines in one late frame without drifting", () => {
    let s = start();
    const { blinkMs } = s.level.timings;
    s = reduce(s, { type: "TICK", now: COUNTDOWN_MS + blinkMs + 10 });
    expect(s.phase).toMatchObject({ name: "distractor", shownAt: COUNTDOWN_MS + blinkMs });
  });

  it("taps: ignores duplicates and extra taps; undo and clear work", () => {
    let s = playPerfectLevel(start(), 0).state;
    // Rebuild a recall phase to test taps.
    s = { ...s, phase: { name: "recall", shownAt: 0, taps: [] } };
    const [a, b] = s.level.sequence;
    s = reduce(s, { type: "TAP", cell: a! });
    s = reduce(s, { type: "TAP", cell: a! });
    s = reduce(s, { type: "TAP", cell: b! });
    expect(s.phase).toMatchObject({ taps: [a, b] });
    s = reduce(s, { type: "UNDO" });
    expect(s.phase).toMatchObject({ taps: [a] });
    s = reduce(s, { type: "CLEAR" });
    expect(s.phase).toMatchObject({ taps: [] });
  });

  it("ends the session when time runs out", () => {
    const s = reduce(start(), { type: "TICK", now: 60_000 });
    expect(s.phase.name).toBe("sessionOver");
  });

  it("pause stops the clock and resume restarts the level with a fresh sequence", () => {
    let s = reduce(start(), { type: "TICK", now: COUNTDOWN_MS });
    const before = s.level.sequence;
    s = reduce(s, { type: "PAUSE", now: 4000 });
    expect(remainingMs(s, 30_000)).toBe(56_000);
    expect(reduce(s, { type: "TICK", now: 30_000 })).toBe(s); // frozen
    s = reduce(s, { type: "RESUME", now: 30_000 });
    expect(remainingMs(s, 30_000)).toBe(56_000);
    expect(s.phase).toEqual({ name: "countdown", endsAt: 30_000 + COUNTDOWN_MS });
    expect(s.level.level).toBe(1);
    expect(s.level.sequence).not.toEqual(before);
  });

  it("untimed sessions never end on their own", () => {
    let s = reduce(createSession({ seed: "p", durationMs: null }), { type: "START", now: 0 });
    s = reduce(s, { type: "TICK", now: 10_000_000 });
    expect(s.phase.name).not.toBe("sessionOver");
    expect(remainingMs(s, 0)).toBeNull();
  });

  it("summarise totals the history", () => {
    const { state } = playPerfectLevel(start(), 0);
    const sum = summarise(state.history);
    expect(sum).toMatchObject({ levelsPlayed: 1, highestLevel: 1, recallAccuracy: 1, distractorAccuracy: 1, avgReactionMs: 300 });
    expect(sum.totalScore).toBe(state.history[0]!.points);
  });
});

describe("tutorial feedback, finish and submissions", () => {
  it("shows right/wrong after an answer when answerFeedbackMs is set", () => {
    let s = reduce(createSession({ seed: "t", durationMs: null, answerFeedbackMs: 1500 }), { type: "START", now: 0 });
    s = reduce(s, { type: "TICK", now: COUNTDOWN_MS + s.level.timings.blinkMs });
    const right = s.level.tasks[0]!.answer;
    s = reduce(s, { type: "ANSWER", answer: right, now: 5000 });
    expect(s.phase).toEqual({ name: "answered", index: 0, correct: true, endsAt: 6500 });
    s = reduce(s, { type: "TICK", now: 6500 });
    expect(s.phase).toMatchObject({ name: "blink", index: 1 });
  });

  it("marks a timeout as correct: null in the tutorial", () => {
    let s = reduce(createSession({ seed: "t", durationMs: null, answerFeedbackMs: 1500 }), { type: "START", now: 0 });
    const { blinkMs, distractorMs } = s.level.timings;
    s = reduce(s, { type: "TICK", now: COUNTDOWN_MS + blinkMs + distractorMs });
    expect(s.phase).toMatchObject({ name: "answered", correct: null });
  });

  it("FINISH ends an untimed session, even while paused", () => {
    let s = reduce(createSession({ seed: "f", durationMs: null }), { type: "START", now: 0 });
    s = reduce(s, { type: "PAUSE", now: 10 });
    s = reduce(s, { type: "FINISH" });
    expect(s.phase.name).toBe("sessionOver");
    expect(s.pausedAt).toBeNull();
  });

  it("feedback carries the submission the server needs", () => {
    const { state } = playPerfectLevel(start(), 0);
    if (state.phase.name !== "feedback") throw new Error("expected feedback");
    expect(state.phase.submission).toMatchObject({ attempt: 0, level: 1 });
    expect(state.phase.submission.responses.taps).toEqual(state.level.sequence);
  });
});
