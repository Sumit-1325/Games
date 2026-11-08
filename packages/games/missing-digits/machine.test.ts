import { describe, expect, it } from "vitest";
import { attemptSeed } from "@cogniarena/game-core";
import { generateLevel } from "./engine";
import { COUNTDOWN_MS, createSession, FEEDBACK_MS, reduce, remainingMs, type SessionState } from "./machine";

const start = (durationMs: number | null = 60_000) => {
  let s = createSession({ seed: "m", durationMs });
  s = reduce(s, { type: "START", now: 0 });
  return reduce(s, { type: "TICK", now: COUNTDOWN_MS });
};
const solving = (s: SessionState) => {
  if (s.phase.name !== "solving") throw new Error(`expected solving, got ${s.phase.name}`);
  return s.phase;
};
const fill = (s: SessionState, digits: number[]) => digits.reduce((acc, d) => reduce(acc, { type: "PUT", digit: d }), s);

describe("missing digits session", () => {
  it("counts down, then shows the first equation (attempt 0, level 1)", () => {
    const s = start();
    expect(solving(s).digits).toEqual([null, null]);
    expect(s.level).toEqual(generateLevel(attemptSeed("m", 0), 1));
  });

  it("fills blanks in order, moving each digit if it's reused", () => {
    let s = start();
    s = reduce(s, { type: "PUT", digit: 4 });
    expect(solving(s)).toMatchObject({ digits: [4, null], selected: 1 });
    s = reduce(s, { type: "PUT", digit: 4 });
    expect(solving(s).digits).toEqual([null, 4]);
    s = reduce(s, { type: "ERASE" });
    expect(solving(s).digits).toEqual([null, null]);
  });

  it("only submits when every blank is filled", () => {
    let s = start();
    s = reduce(s, { type: "PUT", digit: 1 });
    expect(reduce(s, { type: "SUBMIT", now: 5000 }).phase.name).toBe("solving");
  });

  it("a correct answer goes up a level after the feedback", () => {
    let s = fill(start(), s0().level.example);
    s = reduce(s, { type: "SUBMIT", now: 8000 });
    expect(s.phase.name).toBe("feedback");
    if (s.phase.name === "feedback") {
      expect(s.phase.result.passed).toBe(true);
      expect(s.phase.submission).toMatchObject({ attempt: 0, level: 1, responses: { timeMs: 5000 } });
    }
    s = reduce(s, { type: "TICK", now: 8000 + FEEDBACK_MS });
    expect(s.level.level).toBe(2);
    expect(s.attempt).toBe(1);
    expect(solving(s).digits).toHaveLength(3);
  });

  it("ends when the timer runs out, and the timer stops while paused", () => {
    let s = start(10_000);
    s = reduce(s, { type: "PAUSE", now: 4000 });
    expect(remainingMs(s, 9000)).toBe(6000);
    s = reduce(s, { type: "RESUME", now: 9000 });
    expect(s.attempt).toBe(1); // a fresh equation after the pause
    expect(remainingMs(s, 9000)).toBe(6000);
    s = reduce(s, { type: "TICK", now: 15_000 });
    expect(s.phase.name).toBe("sessionOver");
  });

  it("Finish ends an untimed session", () => {
    expect(reduce(start(null), { type: "FINISH" }).phase.name).toBe("sessionOver");
  });
});

function s0() {
  return createSession({ seed: "m", durationMs: null });
}
