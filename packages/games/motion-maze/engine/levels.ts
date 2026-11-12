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
 * Difficulty progression:
 *
 * Level 1: Small grid, 1–2 bars, no rigid blocks. Pure intro — learn sliding.
 * Level 2: Slightly bigger, 2–3 bars, 1–2 rigid blocks. Must move a bar to win.
 * Level 3: 6-area grid, 3–4 bars, 2–4 rigid blocks in pairs. Corridors narrow.
 * Level 4: 7-area grid, 3–5 bars, 3–5 rigid blocks. Multiple bar moves needed.
 * Level 5: 8-area grid, 4–5 bars, 4–6 rigid blocks. Serious chokepoints.
 * Level 6: 8-area grid, 4–6 bars, 5–7 rigid blocks. Dense obstacles.
 * Level 7: 8-area grid, 5–7 bars, 6–8 rigid blocks. Strategic sequencing.
 * Level 8+: 8-area grid, 5–7 bars, 6–8 rigid blocks. Maximum challenge.
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
    barsCount: [3, 4],
    fixedCount: [2, 4],
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
    barsCount: [3, 5],
    fixedCount: [3, 5],
    targetMoves: [4, 6],
    speedBudgetMs: 55000,
  },
  5: {
    gridSize: 8,
    gridDimensions: [
      [8, 5],
      [5, 8],
      [8, 6],
      [6, 8],
      [8, 8],
    ],
    barsCount: [4, 5],
    fixedCount: [4, 6],
    targetMoves: [4, 7],
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
    barsCount: [4, 6],
    fixedCount: [5, 7],
    targetMoves: [5, 8],
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
    barsCount: [5, 7],
    fixedCount: [6, 8],
    targetMoves: [5, 9],
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
    barsCount: [5, 7],
    fixedCount: [6, 8],
    targetMoves: [5, 10],
    speedBudgetMs: 90000,
  },
};

export function getLevelSpec(level: number): LevelSpec {
  if (level in LEVEL_SPECS) return LEVEL_SPECS[level]!;
  // Levels 9+ scale gradually
  const extra = Math.floor((level - 8) / 3);
  return {
    gridSize: 8,
    gridDimensions: [
      [8, 5],
      [8, 6],
      [8, 7],
      [8, 8],
    ],
    barsCount: [5, Math.min(8, 7 + extra)],
    fixedCount: [6, Math.min(10, 8 + extra)],
    targetMoves: [5, Math.min(12, 10 + extra)],
    speedBudgetMs: Math.min(120000, 90000 + (level - 8) * 3000),
  };
}

export function nextLevel(history: Pick<LevelResult, "level" | "passed">[]): number {
  return standardNextLevel(history);
}
