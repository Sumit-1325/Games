"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { Cell } from "@cogniarena/game-core";
import { createSession, reduce, type SessionOptions } from "../machine";

export function useMotionMazeSession(options: SessionOptions) {
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
    moveBall: useCallback(
      (direction: "up" | "down" | "left" | "right") => dispatch({ type: "MOVE_BALL", direction, now: at() }),
      []
    ),
    moveBallTo: useCallback((cell: Cell) => dispatch({ type: "MOVE_BALL_TO", cell, now: at() }), []),
    moveBlock: useCallback(
      (id: string, direction: "up" | "down" | "left" | "right") =>
        dispatch({ type: "MOVE_BLOCK", id, direction, now: at() }),
      []
    ),
    moveBlockTo: useCallback(
      (id: string, to: Cell) => dispatch({ type: "MOVE_BLOCK_TO", id, to, now: at() }),
      []
    ),
    undo: useCallback(() => dispatch({ type: "UNDO" }), []),
    resetLevel: useCallback(() => dispatch({ type: "RESET_LEVEL" }), []),
    submit: useCallback(() => dispatch({ type: "SUBMIT", now: at() }), []),
    pause: useCallback(() => dispatch({ type: "PAUSE", now: at() }), []),
    resume: useCallback(() => dispatch({ type: "RESUME", now: at() }), []),
    finish: useCallback(() => dispatch({ type: "FINISH" }), []),
  };
}

