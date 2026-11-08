/**
 * Scoring: a level passes when the filled-in equation is true, using digits
 * 1–9 with each digit at most once.
 *
 * points = level × 10 if solved, plus a speed bonus of up to 20% of that when
 * solved within the level's time budget. Unsolved = 0.
 */
import { z } from "zod";
import { standardNextLevel, type LevelResult } from "@cogniarena/game-core";
import { formatEquation, isSolution } from "./equation";
import type { MissingDigitsLevel } from "./generateLevel";

export const MAX_SPEED_BONUS = 0.2;
/** Faster than this per blank is not humanly plausible. */
export const MIN_HUMAN_MS_PER_BLANK = 300;

export interface MissingDigitsResponses {
  /** One per blank; null = left empty. */
  digits: (number | null)[];
  /** ms from the equation appearing to Submit. */
  timeMs: number;
}

export interface MissingDigitsResult extends LevelResult {
  /** The equation as the player filled it in. */
  equation: string;
  /** A valid answer, for the results table. */
  answer: string;
  blanks: number;
  timeMs: number;
  /** Saved as level_attempts.avg_rt_ms: the time to answer. */
  avgReactionMs: number;
}

export const missingDigitsResponsesSchema = z.object({
  digits: z.array(z.number().int().min(1).max(9).nullable()).max(12),
  timeMs: z.number().min(0).max(30 * 60_000),
});

export function scoreLevel(level: MissingDigitsLevel, responses: MissingDigitsResponses): MissingDigitsResult {
  const blanks = level.ops.length + 1;
  const digits = Array.from({ length: blanks }, (_, i) => responses.digits[i] ?? null);
  const passed = responses.digits.length === blanks && isSolution(digits, level.ops, level.target);
  const base = passed ? level.level * 10 : 0;
  const speed = Math.max(0, Math.min(1, 1 - responses.timeMs / level.timeBudgetMs));
  return {
    level: level.level,
    passed,
    points: Math.round(base + base * MAX_SPEED_BONUS * speed),
    equation: formatEquation(digits, level.ops, level.target),
    answer: formatEquation(level.example, level.ops, level.target),
    blanks,
    timeMs: Math.round(responses.timeMs),
    avgReactionMs: Math.round(responses.timeMs),
  };
}

export function nextLevel(history: LevelResult[]): number {
  return standardNextLevel(history);
}

export function plausibilityFlags(level: MissingDigitsLevel, responses: MissingDigitsResponses): string[] {
  const blanks = level.ops.length + 1;
  return responses.timeMs < blanks * MIN_HUMAN_MS_PER_BLANK ? ["too-fast"] : [];
}

export interface MissingDigitsSummary {
  totalScore: number;
  highestLevel: number;
  solved: number;
  levelsPlayed: number;
  /** Average time on solved equations; null if none were solved. */
  avgSolveMs: number | null;
}

export function summarise(history: MissingDigitsResult[]): MissingDigitsSummary {
  const solved = history.filter((r) => r.passed);
  return {
    totalScore: history.reduce((s, r) => s + r.points, 0),
    highestLevel: history.reduce((m, r) => Math.max(m, r.level), 0),
    solved: solved.length,
    levelsPlayed: history.length,
    avgSolveMs: solved.length ? Math.round(solved.reduce((s, r) => s + r.timeMs, 0) / solved.length) : null,
  };
}
