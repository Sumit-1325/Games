import { standardNextLevel, type LevelResult } from "@cogniarena/game-core";

export interface LevelSpec {
  gridSize: number;
  barsCount: [number, number]; // min, max
  fixedCount: [number, number];
  targetMoves: [number, number]; // min, max optimal straight-line moves
  speedBudgetMs: number;
}

/**
 * Grid increases each level with difficulty:
 * Level 1: 4×4
 * Level 2: 5×5
 * Level 3: 6×6
 * Level 4: 7×7
 * Level 5: 8×8
 * Level 6+: 8×8 to 9×9
 */
export const LEVEL_SPECS: Record<number, LevelSpec> = {
  1: {
    gridSize: 4,
    barsCount: [1, 2],
    fixedCount: [0, 0],
    targetMoves: [2, 4],
    speedBudgetMs: 25000,
  },
  2: {
    gridSize: 5,
    barsCount: [2, 3],
    fixedCount: [0, 0],
    targetMoves: [3, 5],
    speedBudgetMs: 35000,
  },
  3: {
    gridSize: 6,
    barsCount: [3, 4],
    fixedCount: [1, 1],
    targetMoves: [4, 7],
    speedBudgetMs: 45000,
  },
  4: {
    gridSize: 7,
    barsCount: [4, 5],
    fixedCount: [1, 2],
    targetMoves: [5, 8],
    speedBudgetMs: 55000,
  },
  5: {
    gridSize: 8,
    barsCount: [5, 6],
    fixedCount: [2, 3],
    targetMoves: [6, 10],
    speedBudgetMs: 65000,
  },
};

export function getLevelSpec(level: number): LevelSpec {
  if (level in LEVEL_SPECS) return LEVEL_SPECS[level]!;
  const size = Math.min(9, 8 + Math.floor((level - 5) / 2));
  return {
    gridSize: size,
    barsCount: [5, 7],
    fixedCount: [2, 4],
    targetMoves: [7, 12],
    speedBudgetMs: Math.min(90000, 65000 + (level - 5) * 5000),
  };
}

export function nextLevel(history: Pick<LevelResult, "level" | "passed">[]): number {
  return standardNextLevel(history);
}
