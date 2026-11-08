import { describe, expect, it } from "vitest";
import { evaluate, formatEquation, isSolution } from "./equation";
import { generateLevel, MAX_TARGET } from "./generateLevel";
import { settingsFor } from "./levels";
import { nextLevel, plausibilityFlags, scoreLevel, summarise } from "./score";

describe("evaluate", () => {
  it("does × and ÷ before + and −", () => {
    expect(evaluate([3, 4, 2], ["+", "×"])).toBe(11);
    expect(evaluate([8, 2, 3], ["÷", "+"])).toBe(7);
    expect(evaluate([9, 2, 3], ["-", "×"])).toBe(3);
    expect(evaluate([6, 3, 2, 5], ["÷", "×", "-"])).toBe(-1);
  });

  it("rejects divisions with a remainder", () => {
    expect(evaluate([7, 2], ["÷"])).toBeNull();
  });
});

describe("isSolution", () => {
  it("needs every blank filled with distinct digits 1–9", () => {
    expect(isSolution([3, 4, 2], ["+", "×"], 11)).toBe(true);
    expect(isSolution([3, null, 2], ["+", "×"], 11)).toBe(false);
    expect(isSolution([5, 5], ["+"], 10)).toBe(false);
    expect(isSolution([0, 9], ["+"], 9)).toBe(false);
  });

  it("accepts any answer that works, not only the generated one", () => {
    expect(isSolution([2, 7], ["+"], 9)).toBe(true);
    expect(isSolution([4, 5], ["+"], 9)).toBe(true);
  });
});

describe("generateLevel", () => {
  it("is deterministic per seed and level", () => {
    expect(generateLevel("a", 3)).toEqual(generateLevel("a", 3));
    expect(generateLevel("a", 3)).not.toEqual(generateLevel("b", 3));
  });

  it("always makes a solvable equation within the level's rules", () => {
    for (let level = 1; level <= 8; level++) {
      const s = settingsFor(level);
      for (let i = 0; i < 200; i++) {
        const l = generateLevel(`seed-${i}`, level);
        expect(l.ops).toHaveLength(s.blanks - 1);
        expect(l.ops.every((op) => s.ops.includes(op))).toBe(true);
        expect(isSolution(l.example, l.ops, l.target)).toBe(true);
        expect(l.target).toBeGreaterThanOrEqual(0);
        expect(l.target).toBeLessThanOrEqual(MAX_TARGET);
        if (level >= 2) expect(l.ops).toContain(s.ops.at(-1));
      }
    }
  });

  it("gets harder: 2 blanks at level 1, 5 from level 6", () => {
    expect(generateLevel("x", 1).ops).toHaveLength(1);
    expect(generateLevel("x", 6).ops).toHaveLength(4);
  });
});

describe("scoreLevel", () => {
  const level = generateLevel("score", 3);

  it("passes a correct answer and adds a speed bonus", () => {
    const fast = scoreLevel(level, { digits: level.example, timeMs: 0 });
    const slow = scoreLevel(level, { digits: level.example, timeMs: level.timeBudgetMs * 2 });
    expect(fast.passed).toBe(true);
    expect(slow.points).toBe(30);
    expect(fast.points).toBe(36);
    expect(fast.equation).toBe(formatEquation(level.example, level.ops, level.target));
  });

  it("fails a wrong or incomplete answer with 0 points", () => {
    const wrong = [...level.example].reverse();
    const r = scoreLevel(level, { digits: isSolution(wrong, level.ops, level.target) ? [1, 1, 1] : wrong, timeMs: 5000 });
    expect(r.passed).toBe(false);
    expect(r.points).toBe(0);
    expect(scoreLevel(level, { digits: level.example.slice(0, 2), timeMs: 5000 }).passed).toBe(false);
  });

  it("flags impossibly fast answers", () => {
    expect(plausibilityFlags(level, { digits: level.example, timeMs: 200 })).toEqual(["too-fast"]);
    expect(plausibilityFlags(level, { digits: level.example, timeMs: 4000 })).toEqual([]);
  });

  it("uses the shared level rule", () => {
    const pass = scoreLevel(level, { digits: level.example, timeMs: 5000 });
    expect(nextLevel([pass])).toBe(4);
    const fail = { ...pass, passed: false };
    expect(nextLevel([fail])).toBe(3);
    expect(nextLevel([fail, fail])).toBe(2);
  });

  it("summarises a session", () => {
    const a = scoreLevel(level, { digits: level.example, timeMs: 6000 });
    const b = scoreLevel(level, { digits: [1, 1, 1], timeMs: 9000 });
    expect(summarise([a, b])).toMatchObject({ solved: 1, levelsPlayed: 2, highestLevel: 3, avgSolveMs: 6000 });
  });
});
