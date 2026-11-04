"use client";

/**
 * Connects the pure session machine to the browser:
 * - a requestAnimationFrame loop sends TICK(performance.now()) every frame;
 * - hiding the tab pauses the session (PLAN.md → "Timing and fairness").
 */
import { useCallback, useEffect, useReducer, useState } from "react";
import type { Cell } from "@cogniarena/game-core";
import type { Answer } from "../engine";
import { createSession, reduce, type SessionOptions } from "../machine";

export function useGridRecallSession(options: SessionOptions) {
  const [state, dispatch] = useReducer(reduce, options, createSession);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const t = performance.now();
      dispatch({ type: "TICK", now: t });
      setNow(t);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "PAUSE", now: performance.now() });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const at = () => performance.now();
  return {
    state,
    now,
    start: useCallback(() => dispatch({ type: "START", now: at() }), []),
    answer: useCallback((answer: Answer) => dispatch({ type: "ANSWER", answer, now: at() }), []),
    tap: useCallback((cell: Cell) => dispatch({ type: "TAP", cell }), []),
    undo: useCallback(() => dispatch({ type: "UNDO" }), []),
    clear: useCallback(() => dispatch({ type: "CLEAR" }), []),
    submit: useCallback(() => dispatch({ type: "SUBMIT", now: at() }), []),
    pause: useCallback(() => dispatch({ type: "PAUSE", now: at() }), []),
    resume: useCallback(() => dispatch({ type: "RESUME", now: at() }), []),
    finish: useCallback(() => dispatch({ type: "FINISH" }), []),
  };
}
