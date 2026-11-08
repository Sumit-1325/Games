/**
 * Scoring and level progression, from PLAN.md → "Scoring" and "Levels and difficulty".
 *
 * points = level × 10 × (correct recall positions ÷ balls)   recall points
 *        + speed bonus (up to 20% of recall points)
 *        + 2 × correct distractors
 *
 * A level passes when the whole sequence is recalled in order AND at least 70%
 * of the shape questions are right.
 */
import { z } from "zod";
import { standardNextLevel, type Cell, type LevelResult } from "@cogniarena/game-core";
import type { Answer, GridRecallLevel } from "./generateLevel";

export const PASS_DISTRACTOR_RATIO = 0.7;
export const MAX_SPEED_BONUS = 0.2;
/** Recall at or slower than this per ball earns no speed bonus. */
export const SLOW_RECALL_MS_PER_BALL = 2000;

export interface GridRecallResponses {
  /** Cells tapped on the recall grid, in tap order. */
  taps: Cell[];
  /** One entry per shape question; null = timed out. */
  answers: (Answer | null)[];
  /** ms from shape shown to answer; null = timed out. */
  reactionTimesMs: (number | null)[];
  /** ms from recall grid shown to Submit. */
  recallTimeMs: number;
}

export interface GridRecallResult extends LevelResult {
  recallCorrect: number;
  balls: number;
  distractorCorrect: number;
  distractorTotal: number;
  /** null if every question timed out. */
  avgReactionMs: number | null;
}

const sameCell = (a: Cell | undefined, b: Cell | undefined) =>
  a !== undefined && b !== undefined && a.row === b.row && a.col === b.col;

export function scoreLevel(level: GridRecallLevel, responses: GridRecallResponses): GridRecallResult {
  const balls = level.sequence.length;

  // A position counts only if the right cell was tapped at the right step.
  const recallCorrect = level.sequence.filter((cell, i) => sameCell(cell, responses.taps[i])).length;
  const fullSequence = recallCorrect === balls && responses.taps.length === balls;

  const distractorTotal = level.tasks.length;
  const distractorCorrect = level.tasks.filter((t, i) => responses.answers[i] === t.answer).length;

  const recallPoints = level.level * 10 * (recallCorrect / balls);
  const speed = Math.max(0, Math.min(1, 1 - responses.recallTimeMs / (balls * SLOW_RECALL_MS_PER_BALL)));
  const speedBonus = recallPoints * MAX_SPEED_BONUS * speed;
  const points = Math.round(recallPoints + speedBonus + 2 * distractorCorrect);

  const times = responses.reactionTimesMs.filter((t): t is number => t !== null);
  const avgReactionMs = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null;

  return {
    level: level.level,
    passed: fullSequence && distractorCorrect >= PASS_DISTRACTOR_RATIO * distractorTotal,
    points,
    recallCorrect,
    balls,
    distractorCorrect,
    distractorTotal,
    avgReactionMs,
  };
}

/**
 * Pass → next level. Fail → retry the same level. Fail twice in a row at the
 * same level → drop one level (never below 1).
 */
export function nextLevel(history: LevelResult[]): number {
  return standardNextLevel(history);
}

const cellSchema = z.object({ row: z.number().int().min(0).max(20), col: z.number().int().min(0).max(20) });

/** Server-side validation of a submitted level (bounds generous; scoring checks the rest). */
export const gridRecallResponsesSchema = z.object({
  taps: z.array(cellSchema).max(64),
  answers: z.array(z.enum(["yes", "no"]).nullable()).max(64),
  reactionTimesMs: z.array(z.number().min(0).max(60_000).nullable()).max(64),
  recallTimeMs: z.number().min(0).max(30 * 60_000),
});

/** Answers faster than this are not humanly plausible. */
export const MIN_HUMAN_REACTION_MS = 150;

/**
 * Anti-cheat flags for one submission (PLAN.md → "Scoring and anti-cheat").
 * Flags are stored with the attempt; the session API decides what to reject.
 */
export function plausibilityFlags(level: GridRecallLevel, responses: GridRecallResponses): string[] {
  const flags: string[] = [];
  if (responses.answers.length !== level.tasks.length || responses.reactionTimesMs.length !== level.tasks.length)
    flags.push("answer-count-mismatch");
  if (responses.reactionTimesMs.some((t) => t !== null && t < MIN_HUMAN_REACTION_MS)) flags.push("too-fast-reaction");
  if (responses.taps.some((c) => c.row >= level.rows || c.col >= level.cols)) flags.push("tap-out-of-grid");
  return flags;
}
