"use client";

/**
 * The Missing Digits play screen: top bar (level, timer, pause), the equation
 * in the middle, the keypad and Erase / Clear / Submit at the bottom.
 *
 * Keyboard: 1–9 = digit, ←/→ = move between boxes, Backspace = erase,
 * Enter = submit, Esc = pause.
 *
 * Props match GridRecallPlay's, so the web app treats every game the same way.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { sounds } from "@cogniarena/ui";
import type { MissingDigitsConfig, MissingDigitsResult } from "../engine";
import { summarise } from "../engine";
import { remainingMs, type LevelSubmission, type SessionState } from "../machine";
import { EquationView, Keypad } from "./EquationView";
import { useMissingDigitsSession } from "./useMissingDigitsSession";

export interface MissingDigitsPlayProps {
  seed: string;
  mode: "assessment" | "practice";
  config?: MissingDigitsConfig;
  /** null = untimed. */
  durationMs: number | null;
  sound?: boolean;
  /** Skip the Start button and go straight into the countdown (used after the demo). */
  autoStart?: boolean;
  onPlayAgain: () => void;
  onLevelComplete?: (submission: LevelSubmission, result: MissingDigitsResult) => void;
  onSessionOver?: (state: SessionState) => void;
  resultsFooter?: ReactNode;
}

const btn = {
  primary:
    "rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
  secondary:
    "rounded-xl bg-zinc-200 px-5 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
};

const formatClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Results({ state, onPlayAgain, footer }: { state: SessionState; onPlayAgain: () => void; footer?: ReactNode }) {
  const s = summarise(state.history);
  const stats: [string, string][] = [
    ["Highest level", String(s.highestLevel || "–")],
    ["Solved", `${s.solved}/${s.levelsPlayed}`],
    ["Avg solve time", s.avgSolveMs === null ? "–" : `${(s.avgSolveMs / 1000).toFixed(1)} s`],
    ["Levels played", String(s.levelsPlayed)],
  ];
  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto">
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Session score</p>
        <p className="text-6xl font-bold tabular-nums">{s.totalScore}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{k}</dt>
            <dd className="text-xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {state.history.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-1">Level</th>
              <th>Your answer</th>
              <th>Time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.history.map((r, i) => (
              <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1">{r.level}</td>
                <td className="font-mono">{r.equation}</td>
                <td className="tabular-nums">{(r.timeMs / 1000).toFixed(1)} s</td>
                <td className={r.passed ? "text-emerald-600" : "text-red-500"}>{r.passed ? "Pass" : "Fail"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-col items-center gap-2">
        <button type="button" className={btn.primary} onClick={onPlayAgain}>
          Play again
        </button>
        {footer}
      </div>
    </div>
  );
}

export function MissingDigitsPlay(props: MissingDigitsPlayProps) {
  const { seed, mode, durationMs, sound = false, onPlayAgain, onLevelComplete, onSessionOver } = props;
  const game = useMissingDigitsSession({ seed, durationMs });
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

  // Report each scored equation once, and the end of the session.
  const reported = useRef(-1);
  useEffect(() => {
    if (phase.name === "feedback" && reported.current !== phase.submission.attempt) {
      reported.current = phase.submission.attempt;
      onLevelComplete?.(phase.submission, phase.result);
    }
  }, [phase, onLevelComplete]);
  const over = phase.name === "sessionOver";
  useEffect(() => {
    if (over) onSessionOver?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  const put = (d: number) => {
    if (sound) sounds.click();
    game.put(d);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return void (paused ? game.resume() : game.pause());
      if (phase.name !== "solving" || paused) return;
      if (/^[1-9]$/.test(e.key)) put(Number(e.key));
      else if (e.key === "Backspace") game.erase();
      else if (e.key === "Enter") game.submit();
      else if (e.key === "ArrowLeft") game.select(Math.max(0, phase.selected - 1));
      else if (e.key === "ArrowRight") game.select(Math.min(phase.digits.length - 1, phase.selected + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const left = remainingMs(state, now);
  const active = phase.name !== "idle" && phase.name !== "sessionOver";
  const emptyDigits = Array<number | null>(level.ops.length + 1).fill(null);

  let centre: ReactNode;
  let bottom: ReactNode = null;

  if (paused) {
    centre = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-2xl font-semibold">Paused</p>
        <p className="text-zinc-500 dark:text-zinc-400">The timer is stopped. You&apos;ll get a new equation when you resume.</p>
      </div>
    );
    bottom = (
      <button type="button" className={btn.primary} onClick={game.resume}>
        Resume
      </button>
    );
  } else {
    switch (phase.name) {
      case "idle":
        centre = (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <p className="text-lg text-zinc-600 dark:text-zinc-300">Fill each box with a digit 1–9 so the equation is true. Each digit once.</p>
          </div>
        );
        bottom = (
          <button type="button" className={btn.primary} onClick={game.start} autoFocus>
            Start {mode}
          </button>
        );
        break;
      case "countdown":
        centre = (
          <div className="flex h-full items-center justify-center">
            <span className="text-8xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
              {Math.max(1, Math.ceil((phase.endsAt - now) / 1000))}
            </span>
          </div>
        );
        bottom = <p className="text-zinc-500 dark:text-zinc-400">Get ready: × and ÷ come before + and −.</p>;
        break;
      case "solving":
        centre = (
          <div className="flex h-full flex-col items-center justify-center gap-8">
            <EquationView digits={phase.digits} ops={level.ops} target={level.target} selected={phase.selected} onSelect={game.select} />
            <Keypad used={phase.digits} onDigit={put} />
          </div>
        );
        bottom = (
          <div className="flex w-full items-center gap-3">
            <button type="button" className={btn.secondary} onClick={game.erase} disabled={phase.digits.every((d) => d === null)}>
              Erase
            </button>
            <button type="button" className={btn.secondary} onClick={game.clear} disabled={phase.digits.every((d) => d === null)}>
              Clear
            </button>
            <span className="flex-1" />
            <button
              type="button"
              data-tutorial="submit"
              className={btn.primary}
              onClick={game.submit}
              disabled={phase.digits.some((d) => d === null)}
            >
              Submit
            </button>
          </div>
        );
        break;
      case "feedback": {
        const { result } = phase;
        centre = (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <EquationView digits={phase.digits} ops={level.ops} target={level.target} tone={result.passed ? "right" : "wrong"} />
            {!result.passed && (
              <p className="text-center text-zinc-600 dark:text-zinc-300">
                One answer: <span className="font-mono font-semibold">{result.answer}</span>
              </p>
            )}
          </div>
        );
        bottom = (
          <p role="status" className={`text-lg font-semibold ${result.passed ? "text-emerald-600" : "text-red-500"}`}>
            {result.passed ? `Level passed · +${result.points} points` : "Not quite: that doesn't add up"}
          </p>
        );
        break;
      }
      case "sessionOver":
        centre = <Results state={state} onPlayAgain={onPlayAgain} footer={props.resultsFooter} />;
        break;
    }
  }

  return (
    <div className="flex w-full max-w-[max(18rem,min(calc(100dvh_-_15rem),100%))] flex-col items-center gap-4">
      <header className="flex w-full items-center justify-between gap-3 text-sm sm:text-base">
        <span className="whitespace-nowrap font-semibold">
          Level {level.level} <span className="hidden font-normal text-zinc-500 sm:inline dark:text-zinc-400">· {level.ops.length + 1} boxes</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-xl tabular-nums sm:text-2xl" aria-label="time left">
            {left === null ? "Untimed" : formatClock(left)}
          </span>
          <button type="button" onClick={game.pause} disabled={!active} className={`${btn.secondary} px-3 py-1.5 text-sm`}>
            Pause
          </button>
          {durationMs === null && (
            <button type="button" onClick={game.finish} disabled={!active} className={`${btn.secondary} px-3 py-1.5 text-sm`}>
              Finish
            </button>
          )}
        </span>
      </header>
      <div className="aspect-square w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
        {centre ?? <EquationView digits={emptyDigits} ops={level.ops} target={level.target} />}
      </div>
      <footer className="flex min-h-16 w-full items-center justify-center">{bottom}</footer>
    </div>
  );
}
