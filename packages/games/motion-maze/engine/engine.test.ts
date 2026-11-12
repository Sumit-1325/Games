import { describe, expect, it } from "vitest";
import { solvePuzzle, canBlockMove } from "./solver";
import { generateLevel } from "./generateLevel";
import { scoreLevel, plausibilityFlags } from "./score";
import type { Block, MotionMazeLevel, MotionMazeResponses } from "./types";

describe("Motion Maze BFS Solver (Straight-Line & 4-Directional Block Movement)", () => {
  it("solves an unobstructed straight-line horizontal path in exactly 1 move", () => {
    const res = solvePuzzle(4, { row: 0, col: 0 }, { row: 0, col: 3 }, []);
    expect(res).not.toBeNull();
    expect(res?.solvable).toBe(true);
    expect(res?.optimalMoves).toBe(1);
    expect(res?.path.length).toBe(1);
  });

  it("solves a corner path (horizontal then vertical) in exactly 2 moves", () => {
    const res = solvePuzzle(4, { row: 0, col: 0 }, { row: 3, col: 3 }, []);
    expect(res).not.toBeNull();
    expect(res?.solvable).toBe(true);
    expect(res?.optimalMoves).toBe(2);
  });

  it("allows a vertical obstacle block to move sideways (left/right) when space is free", () => {
    const b = { orientation: "v" as const, length: 2, row: 0, col: 2 };
    const ball = { row: 3, col: 3 };
    const target = { row: 3, col: 0 };

    const canMoveLeft = canBlockMove(b, 0, -1, ball, target, 4, new Set(), new Set());
    expect(canMoveLeft).toBe(true);

    const canMoveRight = canBlockMove(b, 0, 1, ball, target, 4, new Set(), new Set());
    expect(canMoveRight).toBe(true);
  });

  it("finds the shortest path requiring an obstacle bar to be moved aside", () => {
    const blocks: Block[] = [
      { id: "b1", orientation: "v", length: 2, row: 0, col: 1, color: "blue" },
    ];
    const res = solvePuzzle(4, { row: 0, col: 0 }, { row: 0, col: 3 }, blocks);
    expect(res).not.toBeNull();
    expect(res?.solvable).toBe(true);
    expect(res?.optimalMoves).toBe(2);
  });
});

describe("generateLevel - Progression & Non-Repeating Layouts", () => {
  it("is deterministic for the same seed", () => {
    const l1 = generateLevel("test-seed-42", 1);
    const l2 = generateLevel("test-seed-42", 1);
    expect(l1.gridSize).toBe(l2.gridSize);
    expect(l1.redBall).toEqual(l2.redBall);
    expect(l1.target).toEqual(l2.target);
    expect(l1.optimalMoves).toBe(l2.optimalMoves);
    expect(l1.blocks).toEqual(l2.blocks);
  });

  it("generates solvable puzzles for levels 1 through 8 with increasing difficulty and box blocks", () => {
    for (let lvl = 1; lvl <= 8; lvl++) {
      const level = generateLevel(`level-seed-test-${lvl}`, lvl);
      expect(level.level).toBe(lvl);
      expect(level.gridSize).toBeGreaterThanOrEqual(4);
      expect(level.optimalMoves).toBeGreaterThan(0);

      // Verify that after level 2 there are 1x1 box blocks (fixed obstacles)
      if (lvl >= 3) {
        expect(level.fixedBlocks.length).toBeGreaterThanOrEqual(1);
      }

      // Verify level is 100% solvable
      const verification = solvePuzzle(
        { rows: level.rows ?? level.gridSize, cols: level.cols ?? level.gridSize },
        level.redBall,
        level.target,
        level.blocks,
        level.fixedBlocks,
        25000
      );
      expect(verification).not.toBeNull();
      expect(verification?.solvable).toBe(true);
    }
  }, 20000);

  it("generates distinct random layouts for different attempts at level 8 (never repeats)", () => {
    const l8_a = generateLevel("session-seed:attempt:8", 8);
    const l8_b = generateLevel("session-seed:attempt:9", 8);
    const l8_c = generateLevel("session-seed:attempt:10", 8);

    // Layouts must not all be identical
    const sameLayoutAB = JSON.stringify(l8_a.blocks) === JSON.stringify(l8_b.blocks);
    const sameLayoutBC = JSON.stringify(l8_b.blocks) === JSON.stringify(l8_c.blocks);
    expect(sameLayoutAB && sameLayoutBC).toBe(false);
  }, 20000);

  it("supports rectangular grids like 4x3 and 8x5 and verifies solvability", () => {
    const l4x3 = generateLevel("test-4x3", 1, { rows: 4, cols: 3 });
    expect(l4x3.rows).toBe(4);
    expect(l4x3.cols).toBe(3);
    const res4x3 = solvePuzzle(
      { rows: 4, cols: 3 },
      l4x3.redBall,
      l4x3.target,
      l4x3.blocks,
      l4x3.fixedBlocks
    );
    expect(res4x3?.solvable).toBe(true);

    const l8x5 = generateLevel("test-8x5", 5, { rows: 8, cols: 5 });
    expect(l8x5.rows).toBe(8);
    expect(l8x5.cols).toBe(5);
    const res8x5 = solvePuzzle(
      { rows: 8, cols: 5 },
      l8x5.redBall,
      l8x5.target,
      l8x5.blocks,
      l8x5.fixedBlocks
    );
    expect(res8x5?.solvable).toBe(true);
  });

  it("generates rigid fixed blocks in adjacent pairs (one two together) when multiple are placed", () => {
    // Generate several levels and check that fixed blocks contain adjacent pairs
    let foundAdjacentPair = false;
    for (let i = 0; i < 10; i++) {
      const lvl = generateLevel(`rigid-pair-test-${i}`, 5);
      if (lvl.fixedBlocks.length >= 2) {
        for (let a = 0; a < lvl.fixedBlocks.length; a++) {
          const fbA = lvl.fixedBlocks[a];
          if (!fbA) continue;
          for (let b = a + 1; b < lvl.fixedBlocks.length; b++) {
            const fbB = lvl.fixedBlocks[b];
            if (!fbB) continue;
            const dist = Math.abs(fbA.row - fbB.row) + Math.abs(fbA.col - fbB.col);
            if (dist === 1) {
              foundAdjacentPair = true;
              break;
            }
          }
          if (foundAdjacentPair) break;
        }
      }
      if (foundAdjacentPair) break;
    }
    expect(foundAdjacentPair).toBe(true);
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
    optimalMoves: 1,
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
        { piece: "ball", direction: "down", from: { row: 0, col: 0 }, to: { row: 2, col: 0 } },
      ],
      timeMs: 5000,
    });
    expect(res.passed).toBe(true);
    expect(res.points).toBeGreaterThanOrEqual(30);
  });

  it("flags impossible move count and superhuman speed in plausibility", () => {
    const response: MotionMazeResponses = {
      completed: true,
      moves: [],
      timeMs: 400,
    };
    const flags = plausibilityFlags(dummyLevel, response);
    expect(flags).toContain("superhuman-speed");
    expect(flags).toContain("impossible-moves-count");
  });
});
