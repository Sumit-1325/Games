"use client";

/**
 * Connects the pure session machine to the browser: a requestAnimationFrame
 * loop sends TICK every frame, and hiding the tab pauses the session.
 */
import { useCallback, useEffect, useReducer, useState } from "react";
import { createSession, reduce, type SessionOptions } from "../machine";

export function useMissingDigitsSession(options: SessionOptions) {
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
    put: useCallback((digit: number) => dispatch({ type: "PUT", digit }), []),
    select: useCallback((index: number) => dispatch({ type: "SELECT", index }), []),
    erase: useCallback(() => dispatch({ type: "ERASE" }), []),
    clear: useCallback(() => dispatch({ type: "CLEAR" }), []),
    submit: useCallback(() => dispatch({ type: "SUBMIT", now: at() }), []),
    pause: useCallback(() => dispatch({ type: "PAUSE", now: at() }), []),
    resume: useCallback(() => dispatch({ type: "RESUME", now: at() }), []),
    finish: useCallback(() => dispatch({ type: "FINISH" }), []),
  };
}
