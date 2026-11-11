import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, FEEDBACK_MS, createSession, reduce } from "./machine";

describe("Motion Maze machine", () => {
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

  it("handles ball move and collision with grid boundaries", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });
    expect(s.phase.name).toBe("playing");

    if (s.phase.name === "playing") {
      // Put ball at top-left (0, 0)
      const playingPhase = {
        ...s.phase,
        ball: { row: 0, col: 0 },
      };
      s = { ...s, phase: playingPhase };

      // Moving up should be blocked by boundary
      const before = playingPhase.ball;
      s = reduce(s, { type: "MOVE_BALL", direction: "up", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.ball).toEqual(before);
        expect(s.phase.moves.length).toBe(0);
      }
    }
  });

  it("supports UNDO and RESET_LEVEL", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      const initialBall = s.phase.ball;
      // Clear obstacles around ball for test
      s = {
        ...s,
        level: { ...s.level, blocks: [], fixedBlocks: [] },
        phase: { ...s.phase, blocks: [] },
      };

      // Move right (assuming col < gridSize - 1)
      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 5000 });
      if (s.phase.name === "playing") {
        expect(s.phase.moves.length).toBe(1);
        expect(s.phase.ball.col).toBe(initialBall.col + 1);

        // UNDO
        s = reduce(s, { type: "UNDO" });
        if (s.phase.name === "playing") {
          expect(s.phase.ball).toEqual(initialBall);
          expect(s.phase.moves.length).toBe(0);
        }
      }
    }
  });

  it("automatically scores and completes level when ball reaches target", () => {
    let s = createSession({ seed: "test-seed", durationMs: null });
    s = reduce(s, { type: "START", now: 1000 });
    s = reduce(s, { type: "TICK", now: 1000 + COUNTDOWN_MS });

    if (s.phase.name === "playing") {
      const target = s.level.target;
      // Position ball 1 step left of target, clear any obstacles between them
      const ballPos = { row: target.row, col: Math.max(0, target.col - 1) };
      s = {
        ...s,
        level: {
          ...s.level,
          blocks: s.level.blocks.filter((b) => b.row !== target.row),
          fixedBlocks: [],
        },
        phase: {
          ...s.phase,
          ball: ballPos,
          blocks: s.level.blocks.filter((b) => b.row !== target.row),
        },
      };

      // Move right into target
      s = reduce(s, { type: "MOVE_BALL", direction: "right", now: 6000 });
      expect(s.phase.name).toBe("feedback");
      if (s.phase.name === "feedback") {
        expect(s.phase.result.passed).toBe(true);
        expect(s.phase.result.points).toBeGreaterThan(0);
      }

      // Next level after FEEDBACK_MS
      s = reduce(s, { type: "TICK", now: 6000 + FEEDBACK_MS });
      expect(s.phase.name).toBe("playing");
      expect(s.level.level).toBe(2);
    }
  });
});

