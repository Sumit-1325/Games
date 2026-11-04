import { describe, expect, it } from "vitest";
import { generateLevel } from "./generateLevel";
import { isRotationOf } from "./shapes";
import { maxBalls, settingsFor } from "./levels";

describe("generateLevel", () => {
  it("is deterministic for the same seed and level", () => {
    expect(generateLevel("seed-1", 3)).toEqual(generateLevel("seed-1", 3));
  });

  it("differs between seeds and between levels", () => {
    expect(generateLevel("seed-1", 3)).not.toEqual(generateLevel("seed-2", 3));
    expect(generateLevel("seed-1", 4).sequence).not.toEqual(generateLevel("seed-1", 3).sequence);
  });

  it("follows the level table", () => {
    const l1 = generateLevel("s", 1);
    expect([l1.rows, l1.cols, l1.sequence.length]).toEqual([4, 4, 3]);
    const l6 = generateLevel("s", 6);
    expect([l6.rows, l6.cols, l6.sequence.length, l6.timings.blinkMs]).toEqual([6, 6, 6, 800]);
    const l9 = generateLevel("s", 9);
    expect(l9.sequence.length).toBe(9);
    expect(l9.tasks[0]!.left).toHaveLength(7);
  });

  it("uses distinct cells inside the grid, one task per ball", () => {
    for (let level = 1; level <= 12; level++) {
      const l = generateLevel("bounds", level);
      expect(l.tasks).toHaveLength(l.sequence.length);
      expect(new Set(l.sequence.map((c) => `${c.row},${c.col}`)).size).toBe(l.sequence.length);
      for (const c of l.sequence) {
        expect(c.row).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeLessThan(l.rows);
        expect(c.col).toBeLessThan(l.cols);
      }
    }
  });

  it("every task's answer matches what the shapes actually are", () => {
    for (let level = 1; level <= 10; level++) {
      for (const t of generateLevel(`answers-${level}`, level).tasks) {
        expect(isRotationOf(t.left, t.right)).toBe(t.answer === "yes");
      }
    }
  });

  it("keeps yes/no answers balanced within one of half", () => {
    for (let level = 1; level <= 10; level++) {
      const tasks = generateLevel(`balance-${level}`, level).tasks;
      const yes = tasks.filter((t) => t.answer === "yes").length;
      expect(Math.abs(yes - tasks.length / 2)).toBeLessThanOrEqual(0.5);
    }
  });

  it("applies a custom grid and caps balls at 60% of cells", () => {
    const l = generateLevel("custom", 20, { rows: 3, cols: 3 });
    expect([l.rows, l.cols]).toEqual([3, 3]);
    expect(l.sequence.length).toBe(maxBalls(3, 3)); // 5
    expect(settingsFor(1, { rows: 3, cols: 3, balls: 2 }).balls).toBe(2);
  });
});
