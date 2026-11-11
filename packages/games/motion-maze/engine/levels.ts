import { standardNextLevel, type LevelResult } from "@cogniarena/game-core";

export interface LevelSpec {
  gridSize: number;
  barsCount: [number, number]; // min, max
  fixedCount: [number, number];
  targetMoves: [number, number]; // min, max optimal moves
  speedBudgetMs: number;
}

export const LEVEL_SPECS: Record<number, LevelSpec> = {
  1: {
    gridSize: 5,
    barsCount: [2, 3],
    fixedCount: [0, 0],
    targetMoves: [3, 5],
    speedBudgetMs: 30000,
  },
  2: {
    gridSize: 5,
    barsCount: [3, 4],
    fixedCount: [0, 0],
    targetMoves: [5, 7],
    speedBudgetMs: 40000,
  },
  3: {
    gridSize: 6,
    barsCount: [4, 5],
    fixedCount: [1, 1],
    targetMoves: [6, 8],
    speedBudgetMs: 50000,
  },
  4: {
    gridSize: 6,
    barsCount: [5, 6],
    fixedCount: [1, 2],
    targetMoves: [8, 10],
    speedBudgetMs: 60000,
  },
  5: {
    gridSize: 6,
    barsCount: [6, 7],
    fixedCount: [2, 3],
    targetMoves: [10, 14],
    speedBudgetMs: 75000,
  },
};

export function getLevelSpec(level: number): LevelSpec {
  if (level in LEVEL_SPECS) return LEVEL_SPECS[level]!;
  // Level 6+ scales slightly with level
  return {
    gridSize: 6,
    barsCount: [6, 8],
    fixedCount: [2, 4],
    targetMoves: [10, 16],
    speedBudgetMs: Math.min(90000, 75000 + (level - 5) * 5000),
  };
}

export function nextLevel(history: Pick<LevelResult, "level" | "passed">[]): number {
  return standardNextLevel(history);
}

