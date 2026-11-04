import type { z } from "zod";

/** A grid position, zero-based. */
export interface Cell {
  row: number;
  col: number;
}

export type GameMode = "assessment" | "practice" | "tutorial";

/** Outcome of one level, the same shape for every game. */
export interface LevelResult {
  level: number;
  passed: boolean;
  points: number;
  /** Game-specific detail, stored in level_attempts.responses (JSONB). */
  detail?: Record<string, unknown>;
}

/** One coach-mark step of a tutorial, described as data. */
export interface TutorialStep {
  id: string;
  /** CSS selector or data-tutorial id of the element to highlight. */
  target: string;
  caption: string;
  /** Optional scripted demo the tutorial player runs on this step. */
  demo?: { action: string; payload?: unknown };
}

/**
 * The pure, UI-free half of a game's manifest. Browser and server both use it.
 * The web app extends it with React components (Play, ResultsExtra) to form the
 * full GameManifest from PLAN.md, which keeps React out of this package.
 */
export interface GameEngine<Config, Level, Responses, Result extends LevelResult = LevelResult> {
  slug: string;
  title: string;
  companyTags: string[];
  skills: string[];
  version: number;
  modes: GameMode[];
  defaultDurationSec: number;
  configSchema: z.ZodType<Config>;
  generateLevel(seed: string, level: number, config: Config): Level;
  scoreLevel(level: Level, responses: Responses): Result;
  nextLevel(history: Result[]): number;
  tutorial: TutorialStep[];
}
