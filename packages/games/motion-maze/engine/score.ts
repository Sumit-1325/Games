import { getLevelSpec } from "./levels";
import type { MotionMazeLevel, MotionMazeResponses, MotionMazeResult } from "./types";

export function scoreLevel(level: MotionMazeLevel, responses: MotionMazeResponses): MotionMazeResult {
  if (!responses.completed) {
    return {
      level: level.level,
      passed: false,
      points: 0,
      detail: {
        movesCount: responses.moves.length,
        optimalMoves: level.optimalMoves,
        efficiency: 0,
        completed: false,
        timeMs: responses.timeMs,
      },
    };
  }

  const movesCount = responses.moves.length;
  const basePoints = level.level * 10;

  // Move efficiency bonus
  let efficiencyBonus = 0;
  let efficiencyRatio = 1;
  if (movesCount <= level.optimalMoves) {
    efficiencyBonus = 10;
    efficiencyRatio = 1.0;
  } else if (movesCount <= level.optimalMoves + 2) {
    efficiencyBonus = 6;
    efficiencyRatio = 0.8;
  } else if (movesCount <= level.optimalMoves + 5) {
    efficiencyBonus = 3;
    efficiencyRatio = 0.6;
  } else {
    efficiencyBonus = 0;
    efficiencyRatio = Math.max(0.2, level.optimalMoves / movesCount);
  }

  // Speed bonus (up to 20% of base points)
  const spec = getLevelSpec(level.level);
  let speedBonus = 0;
  if (responses.timeMs < spec.speedBudgetMs) {
    const fraction = 1 - responses.timeMs / spec.speedBudgetMs;
    speedBonus = Math.round(fraction * (level.level * 2));
  }

  const totalPoints = basePoints + efficiencyBonus + speedBonus;

  return {
    level: level.level,
    passed: true,
    points: totalPoints,
    detail: {
      movesCount,
      optimalMoves: level.optimalMoves,
      efficiency: Math.round(efficiencyRatio * 100) / 100,
      completed: true,
      timeMs: responses.timeMs,
    },
  };
}

export function plausibilityFlags(level: MotionMazeLevel, responses: MotionMazeResponses): string[] {
  const flags: string[] = [];

  // Completed faster than humanly possible (under 1s)
  if (responses.completed && responses.timeMs < 1000) {
    flags.push("superhuman-speed");
  }

  // Completed in fewer moves than optimal (mathematically impossible per BFS)
  if (responses.completed && responses.moves.length < level.optimalMoves) {
    flags.push("impossible-moves-count");
  }

  return flags;
}

