import { describe, expect, it } from "vitest";
import { generateLevel } from "./generateLevel";
import { nextLevel, scoreLevel, type GridRecallResponses } from "./score";

const level = generateLevel("score", 2); // 4 balls
const perfect: GridRecallResponses = {
  taps: level.sequence,
  answers: level.tasks.map((t) => t.answer),
  reactionTimesMs: level.tasks.map(() => 1000),
  recallTimeMs: 4 * 2000, // slow: no speed bonus
};

describe("scoreLevel", () => {
  it("perfect slow play: passes, level×10 + 2 per distractor", () => {
    const r = scoreLevel(level, perfect);
    expect(r.passed).toBe(true);
    expect(r.points).toBe(2 * 10 + 2 * 4);
    expect(r.avgReactionMs).toBe(1000);
  });

  it("instant recall adds the full 20% bonus on recall points", () => {
    expect(scoreLevel(level, { ...perfect, recallTimeMs: 0 }).points).toBe(24 + 8);
  });

  it("one wrong tap fails the level but keeps partial recall points", () => {
    const taps = [...level.sequence];
    [taps[0], taps[1]] = [taps[1]!, taps[0]!];
    const r = scoreLevel(level, { ...perfect, taps });
    expect(r.passed).toBe(false);
    expect(r.recallCorrect).toBe(2);
    expect(r.points).toBe(10 + 8);
  });

  it("fails below 70% distractor accuracy even with perfect recall", () => {
    const answers = level.tasks.map((t, i) => (i < 2 ? (t.answer === "yes" ? "no" : "yes") : t.answer));
    expect(scoreLevel(level, { ...perfect, answers }).passed).toBe(false); // 2/4 = 50%
  });

  it("treats timeouts as wrong and ignores them in reaction time", () => {
    const r = scoreLevel(level, {
      ...perfect,
      answers: [null, ...perfect.answers.slice(1)],
      reactionTimesMs: [null, 500, 500, 500],
    });
    expect(r.distractorCorrect).toBe(3);
    expect(r.avgReactionMs).toBe(500);
    expect(r.passed).toBe(true); // 75% ≥ 70%
  });

  it("extra taps beyond the sequence fail the level", () => {
    const r = scoreLevel(level, { ...perfect, taps: [...level.sequence, { row: 0, col: 0 }] });
    expect(r.passed).toBe(false);
  });
});

describe("nextLevel", () => {
  const res = (level: number, passed: boolean) => ({ level, passed, points: 0 });

  it("starts at 1", () => expect(nextLevel([])).toBe(1));
  it("pass → up", () => expect(nextLevel([res(3, true)])).toBe(4));
  it("first fail → retry", () => expect(nextLevel([res(2, true), res(3, false)])).toBe(3));
  it("second fail → drop", () => expect(nextLevel([res(3, false), res(3, false)])).toBe(2));
  it("never below 1", () => expect(nextLevel([res(1, false), res(1, false)])).toBe(1));
  it("a pass in between resets the fail count", () =>
    expect(nextLevel([res(3, false), res(3, false), res(2, true), res(3, false)])).toBe(3));
});
