import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, FEEDBACK_MS, createSession, reduce } from "./machine";

describe("Motion Maze machine (Straight-Line Slides & Block Sliding)", () => {
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

  it("slides obstacle blocks like a ball until blocked and counts each slide as a move", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      const block = { id: "b1", orientation: "v" as const, length: 2, row: 0, col: 2, color: "#3b82f6" };
      s = {
        ...s,
        level: { ...s.level, blocks: [block], fixedBlocks: [], target: { row: 3, col: 3 } },
        phase: {
          ...s.phase,
          ball: { row: 3, col: 0 },
          blocks: [block],
        },
      };

      // Slide vertical block LEFT all the way to col 0 in 1 move
      s = reduce(s, { type: "MOVE_BLOCK", id: "b1", direction: "left", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.blocks[0]!.col).toBe(0);
        expect(s.phase.moves.length).toBe(1);

        // Slide vertical block BACKWARD (right) all the way to col 3 in 1 move
        s = reduce(s, { type: "MOVE_BLOCK", id: "b1", direction: "right", now: 6000 });
        if (s.phase.name === "playing") {
          expect(s.phase.blocks[0]!.col).toBe(s.level.gridSize - 1);
          expect(s.phase.moves.length).toBe(2);
        }
      }
    }
  });

  it("supports UNDO and RESET_LEVEL", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      const initialBall = s.phase.ball;
      s = {
        ...s,
        level: { ...s.level, blocks: [], fixedBlocks: [], target: { row: 3, col: 3 } },
        phase: { ...s.phase, blocks: [] },
      };

      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.moves.length).toBe(1);

        s = reduce(s, { type: "UNDO" });
        if (s.phase.name === "playing") {
          expect(s.phase.ball).toEqual(initialBall);
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
      expect(s.level.gridSize).toBe(5);
    }
  });
});
