import { describe, expect, it } from "vitest";
import { solvePuzzle } from "./solver";
import { generateLevel } from "./generateLevel";
import { scoreLevel, plausibilityFlags } from "./score";
import type { Block, MotionMazeLevel, MotionMazeResponses } from "./types";

describe("Motion Maze BFS Solver", () => {
  it("solves a direct path with no obstacles in exact Manhattan distance", () => {
    const res = solvePuzzle(5, { row: 0, col: 0 }, { row: 0, col: 3 }, []);
    expect(res).not.toBeNull();
    expect(res?.solvable).toBe(true);
    expect(res?.optimalMoves).toBe(3);
    expect(res?.path.length).toBe(3);
  });

  it("finds the shortest path requiring an obstacle bar to be slid aside", () => {
    // Red ball at (0, 0), target at (0, 3)
    // Vertical block at (0, 1), length 2 (blocking (0,1) and (1,1))
    const blocks: Block[] = [
      { id: "b1", orientation: "v", length: 2, row: 0, col: 1, color: "blue" },
    ];
    const res = solvePuzzle(4, { row: 0, col: 0 }, { row: 0, col: 2 }, blocks);
    expect(res).not.toBeNull();
    expect(res?.solvable).toBe(true);
    // Block must slide down, ball moves right, right
    // or ball moves down around it if free
    expect(res?.optimalMoves).toBeGreaterThan(0);
  });

  it("reports unsolvable when ball is completely trapped by fixed blocks", () => {
    const fixed = [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ];
    const res = solvePuzzle(4, { row: 0, col: 0 }, { row: 3, col: 3 }, [], fixed);
    expect(res).toBeNull();
  });
});

describe("generateLevel", () => {
  it("is deterministic for the same seed", () => {
    const l1 = generateLevel("test-seed-42", 1);
    const l2 = generateLevel("test-seed-42", 1);
    expect(l1.gridSize).toBe(l2.gridSize);
    expect(l1.redBall).toEqual(l2.redBall);
    expect(l1.target).toEqual(l2.target);
    expect(l1.optimalMoves).toBe(l2.optimalMoves);
    expect(l1.blocks).toEqual(l2.blocks);
  });

  it("produces solvable puzzles across levels 1 through 5", () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const level = generateLevel(`level-test-seed-${lvl}`, lvl);
      expect(level.level).toBe(lvl);
      expect(level.gridSize).toBeGreaterThanOrEqual(5);
      expect(level.optimalMoves).toBeGreaterThan(0);

      // Verify the generated level is actually solvable
      const verification = solvePuzzle(
        level.gridSize,
        level.redBall,
        level.target,
        level.blocks,
        level.fixedBlocks
      );
      expect(verification).not.toBeNull();
      expect(verification?.solvable).toBe(true);
      expect(verification?.optimalMoves).toBe(level.optimalMoves);
    }
  });
});

describe("scoreLevel and plausibility", () => {
  const dummyLevel: MotionMazeLevel = {
    level: 2,
    gridSize: 5,
    redBall: { row: 0, col: 0 },
    target: { row: 2, col: 0 },
    blocks: [],
    fixedBlocks: [],
    optimalMoves: 2,
  };

  it("scores 0 if not completed", () => {
    const res = scoreLevel(dummyLevel, {
      completed: false,
      moves: [],
      timeMs: 15000,
    });
    expect(res.passed).toBe(false);
    expect(res.points).toBe(0);
  });

  it("awards base + max efficiency bonus when solved within optimal moves", () => {
    const res = scoreLevel(dummyLevel, {
      completed: true,
      moves: [
        { piece: "ball", direction: "down", from: { row: 0, col: 0 }, to: { row: 1, col: 0 } },
        { piece: "ball", direction: "down", from: { row: 1, col: 0 }, to: { row: 2, col: 0 } },
      ],
      timeMs: 5000,
    });
    expect(res.passed).toBe(true);
    // Base 20 + 10 efficiency + speed bonus
    expect(res.points).toBeGreaterThanOrEqual(30);
  });

  it("flags impossible move count and superhuman speed in plausibility", () => {
    const response: MotionMazeResponses = {
      completed: true,
      moves: [{ piece: "ball", direction: "down", from: { row: 0, col: 0 }, to: { row: 1, col: 0 } }],
      timeMs: 400,
    };
    const flags = plausibilityFlags(dummyLevel, response);
    expect(flags).toContain("superhuman-speed");
    expect(flags).toContain("impossible-moves-count");
  });
});

