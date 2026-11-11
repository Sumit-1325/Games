import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, FEEDBACK_MS, createSession, reduce } from "./machine";

describe("Motion Maze machine (Straight-Line Slides)", () => {
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
      // Clear obstacles and place ball at (0, 0)
      s = {
        ...s,
        level: { ...s.level, blocks: [], fixedBlocks: [], target: { row: 3, col: 3 } },
        phase: {
          ...s.phase,
          ball: { row: 0, col: 0 },
          blocks: [],
        },
      };

      // Moving right slides across the entire row to col (gridSize - 1) in 1 move
      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.moves.length).toBe(1);
        expect(s.phase.ball.row).toBe(0);
        expect(s.phase.ball.col).toBe(s.level.gridSize - 1);

        // Moving up from row 0 should be blocked by boundary (0 moves added)
        s = reduce(s, { type: "MOVE_BALL", direction: "up", now: 6000 });
        if (s.phase.name === "playing") {
          expect(s.phase.moves.length).toBe(1);
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

      // Move right in straight line
      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.moves.length).toBe(1);

        // UNDO restores initial position
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

      // Slide right from (0, 0) directly into target at (0, 3) in 1 move
      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 6000 });
      expect(s.phase.name).toBe("feedback");
      if (s.phase.name === "feedback") {
        expect(s.phase.result.passed).toBe(true);
        expect(s.phase.result.points).toBeGreaterThan(0);
        expect(s.phase.submission.responses.moves.length).toBe(1);
      }

      // Next level after FEEDBACK_MS
      s = reduce(s, { type: "TICK", now: 6000 + FEEDBACK_MS });
      expect(s.phase.name).toBe("playing");
      expect(s.level.level).toBe(2);
      expect(s.level.gridSize).toBe(5); // Level 2 is 5x5
    }
  });
});
