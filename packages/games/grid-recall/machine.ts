/**
 * One Grid Recall session as a pure state machine (PLAN.md → "Session state machine").
 *
 *   idle → countdown → blink → distractor → (blink → distractor …) → recall → feedback
 *        → countdown (next level) … → sessionOver
 *
 * `reduce(state, event)` has no timers and no React: the UI calls it with
 * TICK(now) on every animation frame, and every deadline is an absolute time
 * (`endsAt`). Each phase starts at the previous phase's `endsAt`, not at "now",
 * so a late frame never makes blinks drift.
 */
import { attemptSeed, type Cell } from "@cogniarena/game-core";
import {
  generateLevel,
  nextLevel,
  scoreLevel,
  type Answer,
  type GridRecallConfig,
  type GridRecallLevel,
  type GridRecallResponses,
  type GridRecallResult,
} from "./engine";

export { attemptSeed };

export const COUNTDOWN_MS = 3000;
export const FEEDBACK_MS = 2500;

export type Phase =
  | { name: "idle" }
  | { name: "countdown"; endsAt: number }
  | { name: "blink"; index: number; endsAt: number }
  | { name: "distractor"; index: number; shownAt: number; endsAt: number }
  /** Tutorial only: "Correct / Not quite" shown briefly after each answer. null = timed out. */
  | { name: "answered"; index: number; correct: boolean | null; endsAt: number }
  | { name: "recall"; shownAt: number; taps: Cell[] }
  | { name: "feedback"; taps: Cell[]; result: GridRecallResult; submission: LevelSubmission; endsAt: number }
  | { name: "sessionOver" };

export type SessionEvent =
  | { type: "START"; now: number }
  | { type: "TICK"; now: number }
  | { type: "ANSWER"; answer: Answer; now: number }
  | { type: "TAP"; cell: Cell }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "SUBMIT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  /** Ends the session now (the Finish button in untimed modes). */
  | { type: "FINISH" };

/** What the browser sends the server for one level; the server rebuilds the level and scores it. */
export interface LevelSubmission {
  attempt: number;
  level: number;
  responses: GridRecallResponses;
}

export interface SessionOptions {
  seed: string;
  config?: GridRecallConfig;
  /** null = untimed (Practice, Tutorial). */
  durationMs: number | null;
  /** Show right/wrong after each shape answer for this long (tutorial). 0 = off. */
  answerFeedbackMs?: number;
}

export interface SessionState {
  seed: string;
  config: GridRecallConfig;
  durationMs: number | null;
  answerFeedbackMs: number;
  /** Levels started so far, counting retries and restarts after a pause. */
  attempt: number;
  level: GridRecallLevel;
  answers: (Answer | null)[];
  reactionTimesMs: (number | null)[];
  history: GridRecallResult[];
  phase: Phase;
  sessionEndsAt: number | null;
  pausedAt: number | null;
}

export function createSession({ seed, config = {}, durationMs, answerFeedbackMs = 0 }: SessionOptions): SessionState {
  return {
    seed,
    config,
    durationMs,
    answerFeedbackMs,
    attempt: 0,
    level: generateLevel(attemptSeed(seed, 0), 1, config),
    answers: [],
    reactionTimesMs: [],
    history: [],
    phase: { name: "idle" },
    sessionEndsAt: null,
    pausedAt: null,
  };
}

/** Begins a new attempt at `levelNo`, with the countdown starting at `at`. */
function beginLevel(state: SessionState, levelNo: number, at: number): SessionState {
  const attempt = state.attempt + 1;
  return {
    ...state,
    attempt,
    level: generateLevel(attemptSeed(state.seed, attempt), levelNo, state.config),
    answers: [],
    reactionTimesMs: [],
    phase: { name: "countdown", endsAt: at + COUNTDOWN_MS },
  };
}

/** After the distractor for ball `index`: next blink, or recall when all have blinked. */
function afterDistractor(state: SessionState, index: number, at: number): Phase {
  return index + 1 < state.level.sequence.length
    ? { name: "blink", index: index + 1, endsAt: at + state.level.timings.blinkMs }
    : { name: "recall", shownAt: at, taps: [] };
}

/** After an answer (or timeout): the tutorial's right/wrong message, or straight on. */
function afterAnswer(state: SessionState, index: number, at: number, answer: Answer | null): Phase {
  if (state.answerFeedbackMs <= 0) return afterDistractor(state, index, at);
  const correct = answer === null ? null : answer === state.level.tasks[index]!.answer;
  return { name: "answered", index, correct, endsAt: at + state.answerFeedbackMs };
}

/** Advances through every deadline that has passed by `now`. */
function tick(state: SessionState, now: number): SessionState {
  if (state.pausedAt !== null || state.phase.name === "idle" || state.phase.name === "sessionOver") return state;
  if (state.sessionEndsAt !== null && now >= state.sessionEndsAt) {
    return { ...state, phase: { name: "sessionOver" } };
  }

  const { phase, level } = state;
  let next: SessionState | null = null;
  switch (phase.name) {
    case "countdown":
      if (now >= phase.endsAt)
        next = { ...state, phase: { name: "blink", index: 0, endsAt: phase.endsAt + level.timings.blinkMs } };
      break;
    case "blink":
      if (now >= phase.endsAt)
        next = {
          ...state,
          phase: {
            name: "distractor",
            index: phase.index,
            shownAt: phase.endsAt,
            endsAt: phase.endsAt + level.timings.distractorMs,
          },
        };
      break;
    case "distractor":
      if (now >= phase.endsAt)
        next = {
          ...state,
          answers: [...state.answers, null],
          reactionTimesMs: [...state.reactionTimesMs, null],
          phase: afterAnswer(state, phase.index, phase.endsAt, null),
        };
      break;
    case "answered":
      if (now >= phase.endsAt) next = { ...state, phase: afterDistractor(state, phase.index, phase.endsAt) };
      break;
    case "feedback":
      if (now >= phase.endsAt) next = beginLevel(state, nextLevel(state.history), phase.endsAt);
      break;
    case "recall":
      break; // waits for SUBMIT
  }
  // A long frame gap can pass several deadlines at once; keep going.
  return next ? tick(next, now) : state;
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

    case "ANSWER":
      if (phase.name !== "distractor") return state;
      return {
        ...state,
        answers: [...state.answers, event.answer],
        reactionTimesMs: [...state.reactionTimesMs, Math.round(event.now - phase.shownAt)],
        phase: afterAnswer(state, phase.index, event.now, event.answer),
      };

    case "TAP": {
      if (phase.name !== "recall") return state;
      const already = phase.taps.some((c) => c.row === event.cell.row && c.col === event.cell.col);
      if (already || phase.taps.length >= state.level.sequence.length) return state;
      return { ...state, phase: { ...phase, taps: [...phase.taps, event.cell] } };
    }

    case "UNDO":
      if (phase.name !== "recall" || phase.taps.length === 0) return state;
      return { ...state, phase: { ...phase, taps: phase.taps.slice(0, -1) } };

    case "CLEAR":
      if (phase.name !== "recall") return state;
      return { ...state, phase: { ...phase, taps: [] } };

    case "SUBMIT": {
      if (phase.name !== "recall") return state;
      const responses: GridRecallResponses = {
        taps: phase.taps,
        answers: state.answers,
        reactionTimesMs: state.reactionTimesMs,
        recallTimeMs: Math.round(event.now - phase.shownAt),
      };
      const result = scoreLevel(state.level, responses);
      const submission: LevelSubmission = { attempt: state.attempt, level: state.level.level, responses };
      return {
        ...state,
        history: [...state.history, result],
        phase: { name: "feedback", taps: phase.taps, result, submission, endsAt: event.now + FEEDBACK_MS },
      };
    }

    case "PAUSE":
      if (phase.name === "idle" || phase.name === "sessionOver") return state;
      return { ...state, pausedAt: event.now };

    case "RESUME": {
      if (state.pausedAt === null) return state;
      // The session clock stops while paused…
      const pausedFor = event.now - state.pausedAt;
      const resumed: SessionState = {
        ...state,
        pausedAt: null,
        sessionEndsAt: state.sessionEndsAt === null ? null : state.sessionEndsAt + pausedFor,
      };
      // …but the interrupted level restarts with a fresh sequence (counted as
      // interrupted, not failed), so pausing can't be used to study the grid.
      // A level already scored just moves on to the next one.
      const levelNo = phase.name === "feedback" ? nextLevel(state.history) : state.level.level;
      return beginLevel(resumed, levelNo, event.now);
    }
  }
}

/** Session time left in ms; null when untimed. */
export function remainingMs(state: SessionState, now: number): number | null {
  if (state.sessionEndsAt === null) return state.durationMs;
  const at = state.pausedAt ?? now;
  return Math.max(0, state.sessionEndsAt - at);
}

export interface SessionSummary {
  totalScore: number;
  levelsPlayed: number;
  highestLevel: number;
  /** 0–1, null when no level was finished. */
  recallAccuracy: number | null;
  distractorAccuracy: number | null;
  avgReactionMs: number | null;
}

export function summarise(history: GridRecallResult[]): SessionSummary {
  const sum = (f: (r: GridRecallResult) => number) => history.reduce((s, r) => s + f(r), 0);
  const balls = sum((r) => r.balls);
  const questions = sum((r) => r.distractorTotal);
  const timed = history.filter((r) => r.avgReactionMs !== null);
  return {
    totalScore: sum((r) => r.points),
    levelsPlayed: history.length,
    highestLevel: history.reduce((m, r) => Math.max(m, r.level), 0),
    recallAccuracy: balls ? sum((r) => r.recallCorrect) / balls : null,
    distractorAccuracy: questions ? sum((r) => r.distractorCorrect) / questions : null,
    avgReactionMs: timed.length
      ? Math.round(timed.reduce((s, r) => s + r.avgReactionMs!, 0) / timed.length)
      : null,
  };
}
