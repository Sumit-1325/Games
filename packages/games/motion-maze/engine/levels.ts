import { standardNextLevel, type LevelResult } from "@cogniarena/game-core";

export interface LevelSpec {
  gridSize: number;
  barsCount: [number, number]; // min, max sliding bars
  fixedCount: [number, number]; // min, max 1x1 box blocks
  targetMoves: [number, number]; // min, max optimal moves
  speedBudgetMs: number;
}

/**
 * Grid size and obstacles scale progressively each level:
 * Level 1: 4×4 grid, 1–2 bars, 0 fixed boxes, par 2–3
 * Level 2: 5×5 grid, 2–3 bars, 1 fixed box, par 3–4
 * Level 3: 6×6 grid, 3–4 bars, 2–3 fixed boxes, par 4–6 (requires moving obstacles)
 * Level 4: 7×7 grid, 4–5 bars, 3–4 fixed boxes, par 5–7
 * Level 5: 8×8 grid, 5–6 bars, 4–5 fixed boxes, par 6–8
 * Level 6: 8×8 grid, 6–7 bars, 5–6 fixed boxes, par 6–9
 * Level 7: 8×8 grid, 6–8 bars, 6–7 fixed boxes, par 7–10
 * Level 8: 8×8 grid, 7–9 bars, 7–8 fixed boxes, par 8–12
 * Level 9+: 8×8 grid, 7–10 bars, 8–10 fixed boxes, par 8–14
 */
export const LEVEL_SPECS: Record<number, LevelSpec> = {
  1: {
    gridSize: 4,
    barsCount: [1, 2],
    fixedCount: [0, 0],
    targetMoves: [2, 3],
    speedBudgetMs: 25000,
  },
  2: {
    gridSize: 5,
    barsCount: [2, 3],
    fixedCount: [1, 1],
    targetMoves: [3, 4],
    speedBudgetMs: 35000,
  },
  3: {
    gridSize: 6,
    barsCount: [3, 4],
    fixedCount: [2, 3],
    targetMoves: [4, 6],
    speedBudgetMs: 45000,
  },
  4: {
    gridSize: 7,
    barsCount: [4, 5],
    fixedCount: [3, 4],
    targetMoves: [5, 7],
    speedBudgetMs: 55000,
  },
  5: {
    gridSize: 8,
    barsCount: [5, 6],
    fixedCount: [4, 5],
    targetMoves: [6, 8],
    speedBudgetMs: 65000,
  },
  6: {
    gridSize: 8,
    barsCount: [6, 7],
    fixedCount: [5, 6],
    targetMoves: [6, 9],
    speedBudgetMs: 75000,
  },
  7: {
    gridSize: 8,
    barsCount: [6, 8],
    fixedCount: [6, 7],
    targetMoves: [7, 10],
    speedBudgetMs: 80000,
  },
  8: {
    gridSize: 8,
    barsCount: [7, 9],
    fixedCount: [7, 8],
    targetMoves: [8, 12],
    speedBudgetMs: 85000,
  },
};

export function getLevelSpec(level: number): LevelSpec {
  if (level in LEVEL_SPECS) return LEVEL_SPECS[level]!;
  return {
    gridSize: 8,
    barsCount: [7, Math.min(10, 8 + Math.floor((level - 8) / 2))],
    fixedCount: [7, Math.min(10, 8 + Math.floor((level - 8) / 2))],
    targetMoves: [8, Math.min(15, 12 + Math.floor((level - 8) / 2))],
    speedBudgetMs: Math.min(100000, 85000 + (level - 8) * 3000),
  };
}

export function nextLevel(history: Pick<LevelResult, "level" | "passed">[]): number {
  return standardNextLevel(history);
}
