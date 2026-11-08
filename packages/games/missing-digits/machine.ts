/**
 * One Missing Digits session as a pure state machine, like Grid Recall's.
 *
 *   idle → countdown → solving → feedback → solving (next equation) … → sessionOver
 *
 * `reduce(state, event)` has no timers and no React: the UI sends TICK(now)
 * every animation frame, and every deadline is an absolute time.
 */
import { attemptSeed } from "@cogniarena/game-core";
import {
  generateLevel,
  nextLevel,
  scoreLevel,
  type MissingDigitsLevel,
  type MissingDigitsResponses,
  type MissingDigitsResult,
} from "./engine";

export const COUNTDOWN_MS = 3000;
export const FEEDBACK_MS = 1800;
/** A wrong answer stays up longer, so the player can read the correct one. */
export const WRONG_FEEDBACK_MS = 3200;

export type Phase =
  | { name: "idle" }
  | { name: "countdown"; endsAt: number }
  /** `selected` = the blank the next digit goes into. */
  | { name: "solving"; shownAt: number; digits: (number | null)[]; selected: number }
  | { name: "feedback"; digits: (number | null)[]; result: MissingDigitsResult; submission: LevelSubmission; endsAt: number }
  | { name: "sessionOver" };

export type SessionEvent =
  | { type: "START"; now: number }
  | { type: "TICK"; now: number }
  /** Put a digit (1–9) into the selected blank. */
  | { type: "PUT"; digit: number }
  | { type: "SELECT"; index: number }
  /** Clear the selected blank, or the last filled one if the selected blank is empty. */
  | { type: "ERASE" }
  | { type: "CLEAR" }
  | { type: "SUBMIT"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "FINISH" };

/** What the browser sends the server for one equation. */
export interface LevelSubmission {
  attempt: number;
  level: number;
  responses: MissingDigitsResponses;
}

export interface SessionOptions {
  seed: string;
  /** null = untimed (Practice). */
  durationMs: number | null;
}

export interface SessionState {
  seed: string;
  durationMs: number | null;
  /** Equations started so far, counting retries and restarts after a pause. */
  attempt: number;
  level: MissingDigitsLevel;
  history: MissingDigitsResult[];
  phase: Phase;
  sessionEndsAt: number | null;
  pausedAt: number | null;
}

const blanksOf = (level: MissingDigitsLevel) => level.ops.length + 1;

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

/** A fresh equation at `levelNo`, shown at `at`. */
function beginLevel(state: SessionState, levelNo: number, at: number): SessionState {
  const attempt = state.attempt + 1;
  const level = generateLevel(attemptSeed(state.seed, attempt), levelNo);
  return {
    ...state,
    attempt,
    level,
    phase: { name: "solving", shownAt: at, digits: Array<number | null>(blanksOf(level)).fill(null), selected: 0 },
  };
}

function tick(state: SessionState, now: number): SessionState {
  if (state.pausedAt !== null || state.phase.name === "idle" || state.phase.name === "sessionOver") return state;
  if (state.sessionEndsAt !== null && now >= state.sessionEndsAt) return { ...state, phase: { name: "sessionOver" } };
  const { phase } = state;
  if (phase.name === "countdown" && now >= phase.endsAt) {
    // The first equation (attempt 0) was generated in createSession.
    const level = state.level;
    return { ...state, phase: { name: "solving", shownAt: phase.endsAt, digits: Array<number | null>(blanksOf(level)).fill(null), selected: 0 } };
  }
  if (phase.name === "feedback" && now >= phase.endsAt) return beginLevel(state, nextLevel(state.history), phase.endsAt);
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

    case "SELECT":
      if (phase.name !== "solving" || event.index < 0 || event.index >= phase.digits.length) return state;
      return { ...state, phase: { ...phase, selected: event.index } };

    case "PUT": {
      if (phase.name !== "solving" || !Number.isInteger(event.digit) || event.digit < 1 || event.digit > 9) return state;
      // Each digit is used once: putting it here takes it out of any other blank.
      const digits = phase.digits.map((d) => (d === event.digit ? null : d));
      digits[phase.selected] = event.digit;
      // Move on to the next empty blank (wrapping), or stay if all are full.
      let selected = phase.selected;
      for (let step = 1; step <= digits.length; step++) {
        const i = (phase.selected + step) % digits.length;
        if (digits[i] === null) {
          selected = i;
          break;
        }
      }
      return { ...state, phase: { ...phase, digits, selected } };
    }

    case "ERASE": {
      if (phase.name !== "solving") return state;
      const digits = [...phase.digits];
      let selected = phase.selected;
      if (digits[selected] === null) {
        let lastFilled = -1;
        digits.forEach((d, i) => {
          if (d !== null) lastFilled = i;
        });
        if (lastFilled === -1) return state;
        selected = lastFilled;
      }
      digits[selected] = null;
      return { ...state, phase: { ...phase, digits, selected } };
    }

    case "CLEAR":
      if (phase.name !== "solving") return state;
      return { ...state, phase: { ...phase, digits: phase.digits.map(() => null), selected: 0 } };

    case "SUBMIT": {
      if (phase.name !== "solving" || phase.digits.some((d) => d === null)) return state;
      const responses: MissingDigitsResponses = { digits: phase.digits, timeMs: Math.round(event.now - phase.shownAt) };
      const result = scoreLevel(state.level, responses);
      const submission: LevelSubmission = { attempt: state.attempt, level: state.level.level, responses };
      return {
        ...state,
        history: [...state.history, result],
        phase: {
          name: "feedback",
          digits: phase.digits,
          result,
          submission,
          endsAt: event.now + (result.passed ? FEEDBACK_MS : WRONG_FEEDBACK_MS),
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
      if (phase.name === "countdown") return { ...resumed, phase: { name: "countdown", endsAt: event.now + COUNTDOWN_MS } };
      // A paused equation is replaced with a new one, so pausing can't buy thinking time.
      const levelNo = phase.name === "feedback" ? nextLevel(state.history) : state.level.level;
      return beginLevel(resumed, levelNo, event.now);
    }
  }
}

/** Session time left in ms; null when untimed. */
export function remainingMs(state: SessionState, now: number): number | null {
  if (state.sessionEndsAt === null) return state.durationMs;
  return Math.max(0, state.sessionEndsAt - (state.pausedAt ?? now));
}
