/**
 * Difficulty table (PLAN.md → "Missing Digits"): more blanks and harder
 * operators as levels go up. Tune after play-testing; bump the manifest
 * `version` when you do.
 */
import { z } from "zod";
import type { Op } from "./equation";

export interface LevelSettings {
  blanks: number;
  ops: Op[];
  /** Solving faster than this earns a speed bonus. */
  timeBudgetMs: number;
}

const TABLE: LevelSettings[] = [
  { blanks: 2, ops: ["+"], timeBudgetMs: 15_000 },
  { blanks: 3, ops: ["+", "-"], timeBudgetMs: 25_000 },
  { blanks: 3, ops: ["+", "-", "×"], timeBudgetMs: 30_000 },
  { blanks: 4, ops: ["+", "-", "×"], timeBudgetMs: 40_000 },
  { blanks: 4, ops: ["+", "-", "×", "÷"], timeBudgetMs: 45_000 },
];
const TOP: LevelSettings = { blanks: 5, ops: ["+", "-", "×", "÷"], timeBudgetMs: 60_000 };

export function settingsFor(level: number): LevelSettings {
  if (!Number.isInteger(level) || level < 1) throw new Error(`Invalid level ${level}`);
  return TABLE[level - 1] ?? TOP;
}

/** No player settings yet; unknown keys (like a grid size) are dropped. */
export const missingDigitsConfigSchema = z.object({});
export type MissingDigitsConfig = z.infer<typeof missingDigitsConfigSchema>;
