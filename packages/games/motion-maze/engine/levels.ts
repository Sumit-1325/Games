import { standardNextLevel, type LevelResult } from "@cogniarena/game-core";

export interface LevelSpec {
  gridSize: number;
  gridDimensions: [number, number][]; // list of [rows, cols] options for this level
  barsCount: [number, number]; // min, max sliding bars
  fixedCount: [number, number]; // min, max 1x1 box blocks
  targetMoves: [number, number]; // min, max optimal moves
  speedBudgetMs: number;
}

/**
 * Grid dimensions, sliding bars, and rigid blocks scale progressively:
 * Level 1: 4×3, 3×4, or 4×4 grid, 1–2 bars, 0 fixed boxes, par 2–3
 * Level 2: 5×4, 4×5, or 5×5 grid, 2–3 bars, 1 fixed box, par 3–4
 * Level 3: 6×5, 5×6, or 6×6 grid, 3–4 bars, 2–3 fixed boxes (pairs), par 4–6
 * Level 4: 7×6, 6×7, or 7×7 grid, 4–5 bars, 3–4 fixed boxes (pairs), par 5–7
 * Level 5: 8×5, 5×8, 8×6, or 8×8 grid, 5–6 bars, 4–5 fixed boxes (pairs), par 6–8
 * Level 6: 8×5, 5×8, 8×6, or 8×7 grid, 6–7 bars, 5–6 fixed boxes (pairs), par 6–9
 * Level 7: 8×6, 6×8, 8×7, or 8×8 grid, 6–8 bars, 6–7 fixed boxes (pairs), par 7–10
 * Level 8: 8×5, 8×6, 8×7, or 8×8 grid, 7–9 bars, 7–8 fixed boxes (pairs), par 8–12
 * Level 9+: 8×5, 8×6, 8×7, or 8×8 grid, 7–10 bars, 8–10 fixed boxes (pairs), par 8–14
 */
export const LEVEL_SPECS: Record<number, LevelSpec> = {
  1: {
    gridSize: 4,
    gridDimensions: [
      [4, 3],
      [3, 4],
      [4, 4],
    ],
    barsCount: [1, 2],
    fixedCount: [0, 0],
    targetMoves: [2, 3],
    speedBudgetMs: 25000,
  },
  2: {
    gridSize: 5,
    gridDimensions: [
      [5, 4],
      [4, 5],
      [5, 5],
    ],
    barsCount: [2, 3],
    fixedCount: [1, 2],
    targetMoves: [3, 4],
    speedBudgetMs: 35000,
  },
  3: {
    gridSize: 6,
    gridDimensions: [
      [6, 5],
      [5, 6],
      [6, 6],
    ],
    barsCount: [2, 3],
    fixedCount: [2, 3],
    targetMoves: [3, 5],
    speedBudgetMs: 45000,
  },
  4: {
    gridSize: 7,
    gridDimensions: [
      [7, 5],
      [5, 7],
      [7, 6],
      [6, 7],
      [7, 7],
    ],
    barsCount: [3, 4],
    fixedCount: [2, 4],
    targetMoves: [3, 5],
    speedBudgetMs: 55000,
  },
  5: {
    gridSize: 8,
    gridDimensions: [
      [8, 5],
      [5, 8],
      [8, 6],
      [8, 8],
    ],
    barsCount: [3, 5],
    fixedCount: [3, 4],
    targetMoves: [4, 6],
    speedBudgetMs: 65000,
  },
  6: {
    gridSize: 8,
    gridDimensions: [
      [8, 5],
      [5, 8],
      [8, 6],
      [8, 7],
    ],
    barsCount: [4, 5],
    fixedCount: [3, 5],
    targetMoves: [4, 6],
    speedBudgetMs: 75000,
  },
  7: {
    gridSize: 8,
    gridDimensions: [
      [8, 6],
      [6, 8],
      [8, 7],
      [8, 8],
    ],
    barsCount: [4, 6],
    fixedCount: [4, 5],
    targetMoves: [4, 7],
    speedBudgetMs: 80000,
  },
  8: {
    gridSize: 8,
    gridDimensions: [
      [8, 5],
      [8, 6],
      [8, 7],
      [8, 8],
    ],
    barsCount: [4, 6],
    fixedCount: [4, 6],
    targetMoves: [4, 8],
    speedBudgetMs: 85000,
  },
};

export function getLevelSpec(level: number): LevelSpec {
  if (level in LEVEL_SPECS) return LEVEL_SPECS[level]!;
  return {
    gridSize: 8,
    gridDimensions: [
      [8, 5],
      [8, 6],
      [8, 7],
      [8, 8],
    ],
    barsCount: [4, Math.min(7, 5 + Math.floor((level - 8) / 3))],
    fixedCount: [4, Math.min(7, 5 + Math.floor((level - 8) / 3))],
    targetMoves: [4, Math.min(10, 7 + Math.floor((level - 8) / 3))],
    speedBudgetMs: Math.min(100000, 85000 + (level - 8) * 3000),
  };
}

export function nextLevel(history: Pick<LevelResult, "level" | "passed">[]): number {
  return standardNextLevel(history);
}
