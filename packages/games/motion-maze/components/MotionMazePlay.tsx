"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { sounds } from "@cogniarena/ui";
import type { MotionMazeConfig, MotionMazeResult } from "../engine";
import { remainingMs, type LevelSubmission, type SessionState } from "../machine";
import { BoardView } from "./BoardView";
import { useMotionMazeSession } from "./useMotionMazeSession";

export interface MotionMazePlayProps {
  seed: string;
  mode: "assessment" | "practice";
  config?: MotionMazeConfig;
  durationMs: number | null;
  sound?: boolean;
  autoStart?: boolean;
  onPlayAgain: () => void;
  onLevelComplete?: (submission: LevelSubmission, result: MotionMazeResult) => void;
  onSessionOver?: (state: SessionState) => void;
  resultsFooter?: ReactNode;
}

const btn = {
  primary:
    "rounded-xl bg-indigo-600 px-6 py-2.5 text-sm sm:text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
  secondary:
    "rounded-xl bg-zinc-800 px-4 py-2 text-xs sm:text-sm font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-40 transition-colors border border-zinc-700",
};

const formatClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Results({ state, onPlayAgain, footer }: { state: SessionState; onPlayAgain: () => void; footer?: ReactNode }) {
  const solved = state.history.filter((h) => h.passed).length;
  const totalPoints = state.history.reduce((sum, h) => sum + h.points, 0);
  const avgEfficiency =
    solved > 0
      ? Math.round(
          (state.history.reduce((sum, h) => sum + ((h.detail?.efficiency as number) ?? 1), 0) / solved) * 100
        )
      : 0;

  const stats: [string, string][] = [
    ["Levels solved", `${solved}/${state.history.length}`],
    ["Move efficiency", `${avgEfficiency}%`],
    ["Total points", String(totalPoints)],
    ["Highest level", String(state.history.length > 0 ? Math.max(...state.history.map((h) => h.level)) : 1)],
  ];

  return (
    <div className="flex h-full w-full max-w-md mx-auto flex-col gap-5 p-4 overflow-y-auto">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Score</p>
        <p className="text-6xl font-black tabular-nums text-indigo-400 mt-1">{totalPoints}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {stats.map(([label, val]) => (
          <div key={label} className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
            <dt className="text-xs text-zinc-400">{label}</dt>
            <dd className="text-xl font-bold tabular-nums text-white mt-0.5">{val}</dd>
          </div>
        ))}
      </dl>

      {state.history.length > 0 && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 max-h-48 overflow-y-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="text-zinc-500 border-b border-slate-800">
              <tr>
                <th className="py-1">Level</th>
                <th>Moves / Par</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {state.history.map((h, i) => (
                <tr key={i} className="py-1">
                  <td className="py-1.5 font-medium">Lvl {h.level}</td>
                  <td>
                    {h.detail?.movesCount ?? "–"} / {h.detail?.optimalMoves ?? "–"}
                  </td>
                  <td className="text-emerald-400 font-semibold">+{h.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <button type="button" onClick={onPlayAgain} className={btn.primary}>
          Play Again
        </button>
        {footer}
      </div>
    </div>
  );
}

export function MotionMazePlay(props: MotionMazePlayProps) {
  const { sound = true, onLevelComplete, onSessionOver } = props;
  const game = useMotionMazeSession({ seed: props.seed, durationMs: props.durationMs });
  const { state, now } = game;
  const { phase, level } = state;
  const paused = state.pausedAt !== null;

  const autoStarted = useRef(false);
  useEffect(() => {
    if (props.autoStart && !autoStarted.current && phase.name === "idle") {
      autoStarted.current = true;
      game.start();
    }
  });

  const reported = useRef(-1);
  useEffect(() => {
    if (phase.name === "feedback" && reported.current !== phase.submission.attempt) {
      reported.current = phase.submission.attempt;
      if (sound) {
        sounds.click();
      }
      onLevelComplete?.(phase.submission, phase.result);
    }
  }, [phase, sound, onLevelComplete]);

  const over = phase.name === "sessionOver";
  useEffect(() => {
    if (over) onSessionOver?.(state);
  }, [over, onSessionOver, state]);

  const left = remainingMs(state, now);
  const movesCount = phase.name === "playing" ? phase.moves.length : 0;
  const canUndo = phase.name === "playing" && phase.historyStates.length > 0;

  if (phase.name === "sessionOver") {
    return <Results state={state} onPlayAgain={props.onPlayAgain} footer={props.resultsFooter} />;
  }

  return (
    <div className="flex h-full w-full max-w-xl mx-auto flex-col items-center justify-between p-2 sm:p-4 select-none">
      {/* Top Header Bar */}
      <header className="flex w-full items-center justify-between px-2 py-1 text-sm sm:text-base">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            Level {level.level}
          </span>
          <div className="text-xs sm:text-sm text-zinc-400">
            Moves: <span className="font-bold text-white tabular-nums">{movesCount}</span>
            <span className="text-zinc-500"> / Par {level.optimalMoves}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {left !== null && (
            <span
              className={`font-mono text-sm sm:text-base font-bold tabular-nums px-2.5 py-1 rounded-lg border ${
                left < 15000
                  ? "bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse"
                  : "bg-slate-800 text-zinc-200 border-slate-700"
              }`}
            >
              {formatClock(left)}
            </span>
          )}
          {phase.name !== "idle" && (
            <button
              type="button"
              onClick={paused ? game.resume : game.pause}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </header>

      {/* Main Board Arena */}
      <main className="relative w-full flex flex-col items-center justify-center my-auto">
        {/* Idle screen */}
        {phase.name === "idle" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <h2 className="text-2xl font-bold text-white">Motion Maze</h2>
            <p className="text-sm text-zinc-400 max-w-xs">
              Slide obstacle bars out of the way and guide the red ball to the black target hole in the fewest moves!
            </p>
            <button type="button" onClick={game.start} className={btn.primary}>
              Start Game
            </button>
          </div>
        )}

        {/* Countdown overlay */}
        {phase.name === "countdown" && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 animate-pulse">
            <span className="text-7xl font-black text-indigo-400 tabular-nums">
              {Math.max(1, Math.ceil((phase.endsAt - now) / 1000))}
            </span>
            <span className="text-sm text-zinc-400 uppercase tracking-widest font-semibold">Get Ready</span>
          </div>
        )}

        {/* Active playing / feedback board */}
        {(phase.name === "playing" || phase.name === "feedback") && (
          <div className="relative w-full flex flex-col items-center">
            {/* Success Feedback Banner */}
            {phase.name === "feedback" && (
              <div className="absolute -top-12 z-20 px-4 py-2 rounded-xl bg-emerald-600/95 text-white font-bold text-sm shadow-xl flex items-center gap-2 animate-bounce">
                <span>✓ Level Cleared!</span>
                <span className="bg-emerald-800/80 px-2 py-0.5 rounded text-xs">+{phase.result.points} pts</span>
              </div>
            )}

            <BoardView
              gridSize={level.gridSize}
              redBall={phase.name === "playing" ? phase.ball : level.target}
              target={level.target}
              blocks={phase.name === "playing" ? phase.blocks : level.blocks}
              fixedBlocks={level.fixedBlocks}
              onMoveBallTo={game.moveBallTo}
              onMoveBall={game.moveBall}
              onMoveBlock={game.moveBlock}
              onMoveBlockTo={game.moveBlockTo}
              disabled={phase.name !== "playing" || paused}
            />
          </div>
        )}

        {/* Paused Overlay */}
        {paused && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Game Paused</h3>
            <p className="text-xs text-zinc-400 mb-4">Timer is paused. Resuming will continue your game.</p>
            <button type="button" onClick={game.resume} className={btn.primary}>
              Resume
            </button>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      {phase.name === "playing" && (
        <footer data-tutorial="board-controls" className="flex flex-col items-center gap-3 w-full max-w-sm mt-2">
          {/* Action buttons: Undo & Reset */}
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              type="button"
              disabled={!canUndo || paused}
              onClick={game.undo}
              className={btn.secondary}
              title="Undo last move"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              disabled={movesCount === 0 || paused}
              onClick={game.resetLevel}
              className={btn.secondary}
              title="Reset level to starting layout"
            >
              ↺ Reset
            </button>
          </div>

          {/* Touch D-Pad for Red Ball navigation */}
          <div className="grid grid-cols-3 gap-1.5 w-32 pt-1">
            <div />
            <button
              type="button"
              disabled={paused}
              onClick={() => game.moveBall("up")}
              className="h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm active:scale-95 border border-slate-700"
              aria-label="Ball Up"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              disabled={paused}
              onClick={() => game.moveBall("left")}
              className="h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm active:scale-95 border border-slate-700"
              aria-label="Ball Left"
            >
              ◀
            </button>
            <button
              type="button"
              disabled={paused}
              onClick={() => game.moveBall("down")}
              className="h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm active:scale-95 border border-slate-700"
              aria-label="Ball Down"
            >
              ▼
            </button>
            <button
              type="button"
              disabled={paused}
              onClick={() => game.moveBall("right")}
              className="h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm active:scale-95 border border-slate-700"
              aria-label="Ball Right"
            >
              ▶
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            Tap adjacent cells, drag bars, or use Arrow keys (W, A, S, D)
          </p>
        </footer>
      )}
    </div>
  );
}

