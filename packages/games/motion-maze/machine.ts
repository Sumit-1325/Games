/**
 * Motion Maze session as a pure state machine:
 *
 *   idle → countdown → playing → feedback → playing (next level) … → sessionOver
 *
 * `reduce(state, event)` has no React and no timers: the UI sends TICK(now)
 * every animation frame, and every deadline is an absolute timestamp.
 */
import { attemptSeed, type Cell } from "@cogniarena/game-core";
import {
  generateLevel,
  getBlockCells,
  nextLevel,
  sameCell,
  scoreLevel,
  type Block,
  type MotionMazeLevel,
  type MotionMazeMove,
  type MotionMazeResponses,
  type MotionMazeResult,
} from "./engine";

export const COUNTDOWN_MS = 3000;
export const FEEDBACK_MS = 1600;

export interface BoardSnapshot {
  ball: Cell;
  blocks: Block[];
}

export type Phase =
  | { name: "idle" }
  | { name: "countdown"; endsAt: number }
  | {
      name: "playing";
      shownAt: number;
      ball: Cell;
      blocks: Block[];
      moves: MotionMazeMove[];
      historyStates: BoardSnapshot[];
    }
  | {
      name: "feedback";
      result: MotionMazeResult;
      submission: LevelSubmission;
      endsAt: number;
    }
  | { name: "sessionOver" };

export interface LevelSubmission {
  attempt: number;
  level: number;
  responses: MotionMazeResponses;
}

export type SessionEvent =
  | { type: "START"; now: number }
  | { type: "TICK"; now: number }
  | { type: "MOVE_BALL"; direction: "up" | "down" | "left" | "right"; now: number }
  | { type: "MOVE_BALL_TO"; cell: Cell; now: number }
  | { type: "MOVE_BLOCK"; id: string; direction: "up" | "down" | "left" | "right"; now: number }
  | { type: "UNDO" }
  | { type: "RESET_LEVEL" }
  | { type: "SUBMIT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "FINISH" };

export interface SessionOptions {
  seed: string;
  durationMs: number | null; // null = Practice mode (untimed)
}

export interface SessionState {
  seed: string;
  durationMs: number | null;
  attempt: number;
  level: MotionMazeLevel;
  history: MotionMazeResult[];
  phase: Phase;
  sessionEndsAt: number | null;
  pausedAt: number | null;
}

export function createSession({ seed, durationMs }: SessionOptions): SessionState {
  return {
    seed,
    durationMs,
    attempt: 0,
    level: generateLevel(attemptSeed(seed, 0), 1),
    history: [],
    phase: { name: "idle" },
    sessionEndsAt: null,
    pausedAt: null,
  };
}

function beginLevel(state: SessionState, levelNo: number, at: number): SessionState {
  const attempt = state.attempt + 1;
  const level = generateLevel(attemptSeed(state.seed, attempt), levelNo);
  return {
    ...state,
    attempt,
    level,
    phase: {
      name: "playing",
      shownAt: at,
      ball: { ...level.redBall },
      blocks: level.blocks.map((b) => ({ ...b })),
      moves: [],
      historyStates: [],
    },
  };
}

function tick(state: SessionState, now: number): SessionState {
  if (state.pausedAt !== null || state.phase.name === "idle" || state.phase.name === "sessionOver") return state;
  if (state.sessionEndsAt !== null && now >= state.sessionEndsAt) {
    return { ...state, phase: { name: "sessionOver" } };
  }

  const { phase } = state;
  if (phase.name === "countdown" && now >= phase.endsAt) {
    const level = state.level;
    return {
      ...state,
      phase: {
        name: "playing",
        shownAt: phase.endsAt,
        ball: { ...level.redBall },
        blocks: level.blocks.map((b) => ({ ...b })),
        moves: [],
        historyStates: [],
      },
    };
  }

  if (phase.name === "feedback" && now >= phase.endsAt) {
    return beginLevel(state, nextLevel(state.history), phase.endsAt);
  }

  return state;
}

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  const { phase } = state;

  if (event.type === "FINISH") {
    if (phase.name === "idle" || phase.name === "sessionOver") return state;
    return { ...state, pausedAt: null, phase: { name: "sessionOver" } };
  }

  if (state.pausedAt !== null && event.type !== "RESUME") return state;

  switch (event.type) {
    case "START":
      if (phase.name !== "idle") return state;
      return {
        ...state,
        sessionEndsAt: state.durationMs === null ? null : event.now + state.durationMs,
        phase: { name: "countdown", endsAt: event.now + COUNTDOWN_MS },
      };

    case "TICK":
      return tick(state, event.now);

    case "MOVE_BALL": {
      if (phase.name !== "playing") return state;
      const dr = event.direction === "up" ? -1 : event.direction === "down" ? 1 : 0;
      const dc = event.direction === "left" ? -1 : event.direction === "right" ? 1 : 0;
      const targetCell: Cell = { row: phase.ball.row + dr, col: phase.ball.col + dc };

      return applyBallMove(state, phase, targetCell, event.direction, event.now);
    }

    case "MOVE_BALL_TO": {
      if (phase.name !== "playing") return state;
      const dr = event.cell.row - phase.ball.row;
      const dc = event.cell.col - phase.ball.col;
      // Must be adjacent (distance 1)
      if (Math.abs(dr) + Math.abs(dc) !== 1) return state;

      const direction: "up" | "down" | "left" | "right" =
        dr === -1 ? "up" : dr === 1 ? "down" : dc === -1 ? "left" : "right";

      return applyBallMove(state, phase, event.cell, direction, event.now);
    }

    case "MOVE_BLOCK": {
      if (phase.name !== "playing") return state;
      const blockIndex = phase.blocks.findIndex((b) => b.id === event.id);
      if (blockIndex === -1) return state;
      const b = phase.blocks[blockIndex]!;

      // Validate direction compatibility
      if (b.orientation === "h" && event.direction !== "left" && event.direction !== "right") return state;
      if (b.orientation === "v" && event.direction !== "up" && event.direction !== "down") return state;

      // Check obstacle collisions
      const { gridSize, target, fixedBlocks } = state.level;
      const occupiedByOtherBlocks = new Set<string>();
      for (let i = 0; i < phase.blocks.length; i++) {
        if (i !== blockIndex) {
          getBlockCells(phase.blocks[i]!).forEach((c) => occupiedByOtherBlocks.add(`${c.row},${c.col}`));
        }
      }
      const fixedSet = new Set(fixedBlocks.map((f) => `${f.row},${f.col}`));

      const isCellFreeForBlock = (r: number, c: number): boolean => {
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
        if (r === phase.ball.row && c === phase.ball.col) return false;
        if (r === target.row && c === target.col) return false;
        const key = `${r},${c}`;
        if (fixedSet.has(key)) return false;
        if (occupiedByOtherBlocks.has(key)) return false;
        return true;
      };

      let newRow = b.row;
      let newCol = b.col;

      if (event.direction === "left") {
        if (!isCellFreeForBlock(b.row, b.col - 1)) return state;
        newCol = b.col - 1;
      } else if (event.direction === "right") {
        if (!isCellFreeForBlock(b.row, b.col + b.length)) return state;
        newCol = b.col + 1;
      } else if (event.direction === "up") {
        if (!isCellFreeForBlock(b.row - 1, b.col)) return state;
        newRow = b.row - 1;
      } else if (event.direction === "down") {
        if (!isCellFreeForBlock(b.row + b.length, b.col)) return state;
        newRow = b.row + 1;
      }

      const nextBlocks = phase.blocks.map((blk, idx) =>
        idx === blockIndex ? { ...blk, row: newRow, col: newCol } : blk
      );

      const moveRecord: MotionMazeMove = {
        piece: b.id,
        direction: event.direction,
        from: { row: b.row, col: b.col },
        to: { row: newRow, col: newCol },
      };

      return {
        ...state,
        phase: {
          ...phase,
          blocks: nextBlocks,
          moves: [...phase.moves, moveRecord],
          historyStates: [...phase.historyStates, { ball: phase.ball, blocks: phase.blocks }],
        },
      };
    }

    case "UNDO": {
      if (phase.name !== "playing" || phase.historyStates.length === 0) return state;
      const lastState = phase.historyStates[phase.historyStates.length - 1]!;
      return {
        ...state,
        phase: {
          ...phase,
          ball: lastState.ball,
          blocks: lastState.blocks,
          moves: phase.moves.slice(0, -1),
          historyStates: phase.historyStates.slice(0, -1),
        },
      };
    }

    case "RESET_LEVEL": {
      if (phase.name !== "playing") return state;
      return {
        ...state,
        phase: {
          ...phase,
          ball: { ...state.level.redBall },
          blocks: state.level.blocks.map((b) => ({ ...b })),
          moves: [],
          historyStates: [],
        },
      };
    }

    case "SUBMIT": {
      if (phase.name !== "playing") return state;
      const isTargetReached = sameCell(phase.ball, state.level.target);
      const responses: MotionMazeResponses = {
        completed: isTargetReached,
        moves: phase.moves,
        timeMs: Math.max(0, Math.round(event.now - phase.shownAt)),
      };
      const result = scoreLevel(state.level, responses);
      const submission: LevelSubmission = { attempt: state.attempt, level: state.level.level, responses };

      return {
        ...state,
        history: [...state.history, result],
        phase: {
          name: "feedback",
          result,
          submission,
          endsAt: event.now + (result.passed ? FEEDBACK_MS : FEEDBACK_MS * 1.5),
        },
      };
    }

    case "PAUSE":
      if (phase.name === "idle" || phase.name === "sessionOver") return state;
      return { ...state, pausedAt: event.now };

    case "RESUME": {
      if (state.pausedAt === null) return state;
      const pausedFor = event.now - state.pausedAt;
      const resumed: SessionState = {
        ...state,
        pausedAt: null,
        sessionEndsAt: state.sessionEndsAt === null ? null : state.sessionEndsAt + pausedFor,
      };
      if (phase.name === "countdown") {
        return { ...resumed, phase: { name: "countdown", endsAt: event.now + COUNTDOWN_MS } };
      }
      const levelNo = phase.name === "feedback" ? nextLevel(state.history) : state.level.level;
      return beginLevel(resumed, levelNo, event.now);
    }
  }
}

function applyBallMove(
  state: SessionState,
  phase: Extract<Phase, { name: "playing" }>,
  targetCell: Cell,
  direction: "up" | "down" | "left" | "right",
  now: number
): SessionState {
  const { gridSize, target, fixedBlocks } = state.level;

  // Bounds check
  if (targetCell.row < 0 || targetCell.row >= gridSize || targetCell.col < 0 || targetCell.col >= gridSize) {
    return state;
  }

  // Fixed blocks check
  if (fixedBlocks.some((f) => sameCell(f, targetCell))) {
    return state;
  }

  // Sliding blocks check
  const blockCells = phase.blocks.flatMap(getBlockCells);
  if (blockCells.some((c) => sameCell(c, targetCell))) {
    return state;
  }

  const nextMoves = [
    ...phase.moves,
    {
      piece: "ball",
      direction,
      from: phase.ball,
      to: targetCell,
    },
  ];

  const nextHistory = [...phase.historyStates, { ball: phase.ball, blocks: phase.blocks }];

  // Check if ball reached target
  if (sameCell(targetCell, target)) {
    const responses: MotionMazeResponses = {
      completed: true,
      moves: nextMoves,
      timeMs: Math.max(0, Math.round(now - phase.shownAt)),
    };
    const result = scoreLevel(state.level, responses);
    const submission: LevelSubmission = { attempt: state.attempt, level: state.level.level, responses };

    return {
      ...state,
      history: [...state.history, result],
      phase: {
        name: "feedback",
        result,
        submission,
        endsAt: now + FEEDBACK_MS,
      },
    };
  }

  return {
    ...state,
    phase: {
      ...phase,
      ball: targetCell,
      moves: nextMoves,
      historyStates: nextHistory,
    },
  };
}

export function remainingMs(state: SessionState, now: number): number | null {
  if (state.sessionEndsAt === null) return state.durationMs;
  return Math.max(0, state.sessionEndsAt - (state.pausedAt ?? now));
}

