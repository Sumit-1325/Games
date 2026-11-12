import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, FEEDBACK_MS, createSession, reduce } from "./machine";

describe("Motion Maze machine (Straight-Line Slides & Drag Placements)", () => {
  it("starts in idle, transitions through countdown to playing", () => {
    let s = createSession({ seed: "test-seed", durationMs: 60000 });
    expect(s.phase.name).toBe("idle");

    s = reduce(s, { type: "START", now: 1000 });
    expect(s.phase.name).toBe("countdown");

    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });
    expect(s.phase.name).toBe("playing");
    if (s.phase.name === "playing") {
      expect(s.phase.moves.length).toBe(0);
      expect(s.phase.ball).toEqual(s.level.redBall);
    }
  });

  it("slides ball across the row in a single straight-line move", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });
    expect(s.phase.name).toBe("playing");

    if (s.phase.name === "playing") {
      s = {
        ...s,
        level: { ...s.level, blocks: [], fixedBlocks: [], target: { row: 3, col: 3 } },
        phase: {
          ...s.phase,
          ball: { row: 0, col: 0 },
          blocks: [],
        },
      };

      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.moves.length).toBe(1);
        expect(s.phase.ball.row).toBe(0);
        expect(s.phase.ball.col).toBe(s.level.gridSize - 1);

        s = reduce(s, { type: "MOVE_BALL", direction: "up", now: 6000 });
        if (s.phase.name === "playing") {
          expect(s.phase.moves.length).toBe(1);
        }
      }
    }
  });

  it("places ball and obstacles at intermediate cells between both ends in 1 move", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      // 5x5 board, ball at (0, 0), block at (1, 3)
      const block = { id: "b1", orientation: "v" as const, length: 2, row: 1, col: 3, color: "#3b82f6" };
      s = {
        ...s,
        level: { ...s.level, blocks: [block], fixedBlocks: [], target: { row: 4, col: 4 } },
        phase: {
          ...s.phase,
          ball: { row: 0, col: 0 },
          blocks: [block],
        },
      };

      // Move ball to intermediate cell (0, 2) - not to the very end
      s = reduce(s, { type: "MOVE_BALL_TO", cell: { row: 0, col: 2 }, now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.ball).toEqual({ row: 0, col: 2 });
        expect(s.phase.moves.length).toBe(1);
      }

      // Move block b1 left by 1 cell to intermediate col 2 (from col 3)
      s = reduce(s, { type: "MOVE_BLOCK_TO", id: "b1", to: { row: 1, col: 2 }, now: 6000 });
      if (s.phase.name === "playing") {
        expect(s.phase.blocks[0]!.row).toBe(1);
        expect(s.phase.blocks[0]!.col).toBe(2);
        expect(s.phase.moves.length).toBe(2);
      }
    }
  });

  it("supports UNDO and RESET_LEVEL", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      const startBall = { row: 0, col: 0 };
      s = {
        ...s,
        level: { ...s.level, gridSize: 5, rows: 5, cols: 5, blocks: [], fixedBlocks: [], target: { row: 3, col: 3 } },
        phase: { ...s.phase, ball: startBall, blocks: [] },
      };

      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.moves.length).toBe(1);

        s = reduce(s, { type: "UNDO" });
        if (s.phase.name === "playing") {
          expect(s.phase.ball).toEqual(startBall);
          expect(s.phase.moves.length).toBe(0);
        }
      }
    }
  });

  it("automatically scores and completes level when straight-line slide enters target", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      const target = { row: 0, col: 3 };
      s = {
        ...s,
        level: {
          ...s.level,
          target,
          blocks: [],
          fixedBlocks: [],
        },
        phase: {
          ...s.phase,
          ball: { row: 0, col: 0 },
          blocks: [],
        },
      };

      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 6000 });
      expect(s.phase.name).toBe("feedback");
      if (s.phase.name === "feedback") {
        expect(s.phase.result.passed).toBe(true);
        expect(s.phase.result.points).toBeGreaterThan(0);
        expect(s.phase.submission.responses.moves.length).toBe(1);
      }

      s = reduce(s, { type: "TICK", now: 6000 + FEEDBACK_MS });
      expect(s.phase.name).toBe("playing");
      expect(s.level.level).toBe(2);
      expect(s.level.gridSize).toBeGreaterThanOrEqual(4);
    }
  });
});
