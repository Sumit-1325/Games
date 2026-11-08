/**
 * The level rule every game uses (PLAN.md → "Levels and difficulty"):
 * pass → next level; fail → retry the same level; fail twice in a row at the
 * same level → drop one level (never below 1). The server calls this to decide
 * each level itself, so the browser can't skip ahead.
 */
import type { LevelResult } from "./types";

export function standardNextLevel(history: Pick<LevelResult, "level" | "passed">[]): number {
  const last = history.at(-1);
  if (!last) return 1;
  if (last.passed) return last.level + 1;

  let failsHere = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const r = history[i]!;
    if (r.level !== last.level || r.passed) break;
    failsHere++;
  }
  return failsHere >= 2 ? Math.max(1, last.level - 1) : last.level;
}
