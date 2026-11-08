/**
 * Builds one equation from a seed. Same (seed, level) → same equation, so the
 * server can rebuild it to score a submission.
 *
 * It tries distinct digits and operators, keeps a combination where every
 * division is exact and the answer is 0–99, and shows only the operators and
 * the answer. Any digits that make it true count, not just the ones used here.
 */
import { createRng } from "@cogniarena/game-core";
import { DIGITS, evaluate, type Op } from "./equation";
import { settingsFor, type MissingDigitsConfig } from "./levels";

export interface MissingDigitsLevel {
  level: number;
  ops: Op[];
  target: number;
  /** One valid answer (shown after a wrong answer). */
  example: number[];
  timeBudgetMs: number;
}

export const MAX_TARGET = 99;

export function generateLevel(seed: string, level: number, _config: MissingDigitsConfig = {}): MissingDigitsLevel {
  const settings = settingsFor(level);
  const rng = createRng(`${seed}:missing-digits:${level}`);
  const newest = settings.ops.at(-1)!;

  for (let tries = 0; tries < 10_000; tries++) {
    const digits = rng.shuffle(DIGITS).slice(0, settings.blanks);
    const ops = Array.from({ length: settings.blanks - 1 }, () => rng.pick(settings.ops));
    // From level 2 on, make sure the level's newest operator actually appears.
    if (level >= 2 && !ops.includes(newest)) continue;
    // × 1 and ÷ 1 make it too easy.
    if (ops.some((op, i) => (op === "÷" || op === "×") && digits[i + 1] === 1)) continue;
    const target = evaluate(digits, ops);
    if (target === null || target < 0 || target > MAX_TARGET) continue;
    return { level, ops, target, example: digits, timeBudgetMs: settings.timeBudgetMs };
  }
  throw new Error(`Could not build a level ${level} equation`);
}
