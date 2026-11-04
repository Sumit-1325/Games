/**
 * Difficulty table from PLAN.md → "Levels and difficulty".
 * Tune these numbers after play-testing; bump the manifest `version` when you do.
 */
import { z } from "zod";
import type { QuarterTurns } from "./shapes";

export interface LevelSettings {
  rows: number;
  cols: number;
  balls: number;
  blinkMs: number;
  distractorMs: number;
  /** Cells per distractor shape. */
  shapeSize: number;
  /** Rotations the right-hand shape may use. */
  angles: QuarterTurns[];
  /** Use the fixed L-tetromino instead of a random shape (easiest levels). */
  fixedL: boolean;
}

const ONE_ANGLE: QuarterTurns[] = [1];
const ALL_ANGLES: QuarterTurns[] = [1, 2, 3];

const TABLE: LevelSettings[] = [
  { rows: 4, cols: 4, balls: 3, blinkMs: 1000, distractorMs: 5000, shapeSize: 4, angles: ONE_ANGLE, fixedL: true },
  { rows: 4, cols: 4, balls: 4, blinkMs: 1000, distractorMs: 5000, shapeSize: 4, angles: ONE_ANGLE, fixedL: true },
  { rows: 5, cols: 5, balls: 4, blinkMs: 900, distractorMs: 4500, shapeSize: 5, angles: ONE_ANGLE, fixedL: false },
  { rows: 5, cols: 5, balls: 5, blinkMs: 900, distractorMs: 4000, shapeSize: 5, angles: ALL_ANGLES, fixedL: false },
  { rows: 5, cols: 5, balls: 6, blinkMs: 800, distractorMs: 4000, shapeSize: 6, angles: ALL_ANGLES, fixedL: false },
  { rows: 6, cols: 6, balls: 6, blinkMs: 800, distractorMs: 3500, shapeSize: 6, angles: ALL_ANGLES, fixedL: false },
];

/** Level 7+: 6×6, one more ball per level, 7-cell shapes. */
function beyondTable(level: number): LevelSettings {
  return {
    rows: 6,
    cols: 6,
    balls: 6 + (level - 6),
    blinkMs: 700,
    distractorMs: 3000,
    shapeSize: 7,
    angles: ALL_ANGLES,
    fixedL: false,
  };
}

export const MIN_GRID = 3;
export const MAX_GRID = 8;
/** Never fill more than 60% of the grid with balls. */
export const MAX_BALL_RATIO = 0.6;

/**
 * Player-chosen settings. Leave rows/cols out to use the level table
 * (Assessment); set them for Practice. `balls` is only used by the tutorial.
 */
export const gridRecallConfigSchema = z.object({
  rows: z.number().int().min(MIN_GRID).max(MAX_GRID).optional(),
  cols: z.number().int().min(MIN_GRID).max(MAX_GRID).optional(),
  balls: z.number().int().min(1).optional(),
});
export type GridRecallConfig = z.infer<typeof gridRecallConfigSchema>;

export function maxBalls(rows: number, cols: number): number {
  return Math.max(1, Math.floor(rows * cols * MAX_BALL_RATIO));
}

/** Settings for a level after applying the custom grid and the ball cap. */
export function settingsFor(level: number, config: GridRecallConfig = {}): LevelSettings {
  if (!Number.isInteger(level) || level < 1) throw new Error(`Invalid level ${level}`);
  const base = level <= TABLE.length ? TABLE[level - 1]! : beyondTable(level);
  const rows = config.rows ?? base.rows;
  const cols = config.cols ?? base.cols;
  const balls = Math.min(config.balls ?? base.balls, maxBalls(rows, cols));
  return { ...base, rows, cols, balls };
}
