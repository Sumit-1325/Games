"use client";

/**
 * The Play screen (PLAN.md → "Screens"): top bar (level, balls left, timer,
 * pause), a fixed-size square in the centre whose content changes by phase, and
 * a bottom bar with Yes/No or Undo/Clear/Submit. Nothing moves between phases.
 *
 * Keyboard: Y / ← = Yes, N / → = No, Backspace = Undo, Esc = Pause.
 */
import { useEffect, type ReactNode } from "react";
import type { GridRecallConfig } from "../engine";
import { remainingMs, summarise, type SessionState } from "../machine";
import { GridBoard } from "./GridBoard";
import { ShapeQuestion } from "./ShapeQuestion";
import { useGridRecallSession } from "./useGridRecallSession";

export type PlayMode = "assessment" | "practice" | "tutorial";

export interface GridRecallPlayProps {
  seed: string;
  mode: PlayMode;
  config?: GridRecallConfig;
  /** null = untimed. */
  durationMs: number | null;
  onPlayAgain: () => void;
}

const formatClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const btn = {
  primary:
    "rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
  secondary:
    "rounded-xl bg-zinc-200 px-5 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
  answer:
    "min-h-14 flex-1 rounded-xl text-lg font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
};

function Hud({ state, now, onPause }: { state: SessionState; now: number; onPause: () => void }) {
  const { phase, level } = state;
  const blinked =
    phase.name === "blink" ? phase.index : phase.name === "distractor" ? phase.index + 1 : phase.name === "countdown" || phase.name === "idle" ? 0 : level.sequence.length;
  const left = remainingMs(state, now);
  const active = phase.name !== "idle" && phase.name !== "sessionOver";
  return (
    <header className="flex w-full items-center justify-between gap-4 text-sm sm:text-base">
      <span className="font-semibold">Level {level.level}</span>
      <span className="flex gap-1.5" aria-label={`${level.sequence.length - blinked} balls left`}>
        {level.sequence.map((_, i) => (
          <span key={i} className={`size-2.5 rounded-full ${i < blinked ? "bg-zinc-300 dark:bg-zinc-700" : "bg-indigo-500"}`} />
        ))}
      </span>
      <span className="flex items-center gap-3">
        <span className="font-mono text-xl tabular-nums sm:text-2xl" aria-label="time left">
          {left === null ? "Practice" : formatClock(left)}
        </span>
        <button type="button" onClick={onPause} disabled={!active} className={`${btn.secondary} px-3 py-1.5 text-sm`}>
          Pause
        </button>
      </span>
    </header>
  );
}

function Results({ state, onPlayAgain }: { state: SessionState; onPlayAgain: () => void }) {
  const s = summarise(state.history);
  const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);
  const stats: [string, string][] = [
    ["Highest level", String(s.highestLevel || "–")],
    ["Recall accuracy", pct(s.recallAccuracy)],
    ["Shape accuracy", pct(s.distractorAccuracy)],
    ["Avg reaction", s.avgReactionMs === null ? "–" : `${s.avgReactionMs} ms`],
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
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-500 dark:text-zinc-400">
          <tr><th className="py-1">Level</th><th>Recall</th><th>Shapes</th><th>Points</th><th /></tr>
        </thead>
        <tbody>
          {state.history.map((r, i) => (
            <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1">{r.level}</td>
              <td>{r.recallCorrect}/{r.balls}</td>
              <td>{r.distractorCorrect}/{r.distractorTotal}</td>
              <td>{r.points}</td>
              <td className={r.passed ? "text-emerald-600" : "text-red-500"}>{r.passed ? "Pass" : "Fail"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={`${btn.primary} self-center`} onClick={onPlayAgain}>
        Play again
      </button>
    </div>
  );
}

export function GridRecallPlay({ seed, mode, config, durationMs, onPlayAgain }: GridRecallPlayProps) {
  const game = useGridRecallSession({ seed, config, durationMs });
  const { state, now } = game;
  const { phase, level } = state;
  const paused = state.pausedAt !== null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return void (paused ? game.resume() : game.pause());
      if (phase.name === "distractor") {
        if (e.key === "y" || e.key === "Y" || e.key === "ArrowLeft") game.answer("yes");
        if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") game.answer("no");
      }
      if (phase.name === "recall" && e.key === "Backspace") game.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase.name, paused, game]);

  let centre: ReactNode;
  let bottom: ReactNode = null;

  if (paused) {
    centre = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-2xl font-semibold">Paused</p>
        <p className="text-zinc-500 dark:text-zinc-400">The timer is stopped. This level restarts with a new pattern when you resume.</p>
      </div>
    );
    bottom = <button type="button" className={btn.primary} onClick={game.resume}>Resume</button>;
  } else {
    switch (phase.name) {
      case "idle":
        centre = <GridBoard rows={level.rows} cols={level.cols} />;
        bottom = (
          <button type="button" className={btn.primary} onClick={game.start} autoFocus>
            Start {mode === "assessment" ? "assessment" : mode}
          </button>
        );
        break;
      case "countdown":
        centre = (
          <div className="relative h-full w-full">
            <GridBoard rows={level.rows} cols={level.cols} />
            <span className="absolute inset-0 flex items-center justify-center text-8xl font-bold text-indigo-600 tabular-nums dark:text-indigo-400">
              {Math.max(1, Math.ceil((phase.endsAt - now) / 1000))}
            </span>
          </div>
        );
        bottom = <p className="text-zinc-500 dark:text-zinc-400">Get ready: remember the order the balls blink in.</p>;
        break;
      case "blink":
        centre = <GridBoard rows={level.rows} cols={level.cols} lit={level.sequence[phase.index]} />;
        bottom = <p className="text-zinc-500 dark:text-zinc-400">Remember this position.</p>;
        break;
      case "distractor":
        centre = <ShapeQuestion task={level.tasks[phase.index]!} shownAt={phase.shownAt} endsAt={phase.endsAt} now={now} />;
        bottom = (
          <div className="flex w-full gap-3">
            <button type="button" className={`${btn.answer} bg-indigo-600 hover:bg-indigo-500`} onClick={() => game.answer("yes")}>
              Yes <span className="text-sm opacity-70">(Y)</span>
            </button>
            <button type="button" className={`${btn.answer} bg-zinc-700 hover:bg-zinc-600`} onClick={() => game.answer("no")}>
              No <span className="text-sm opacity-70">(N)</span>
            </button>
          </div>
        );
        break;
      case "recall":
        centre = <GridBoard rows={level.rows} cols={level.cols} taps={phase.taps} onTap={game.tap} />;
        bottom = (
          <div data-tutorial="recall-controls" className="flex w-full items-center gap-3">
            <button type="button" className={btn.secondary} onClick={game.undo} disabled={!phase.taps.length}>Undo</button>
            <button type="button" className={btn.secondary} onClick={game.clear} disabled={!phase.taps.length}>Clear</button>
            <span className="flex-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {phase.taps.length}/{level.sequence.length} tapped
            </span>
            <button type="button" className={btn.primary} onClick={game.submit} disabled={!phase.taps.length}>Submit</button>
          </div>
        );
        break;
      case "feedback":
        centre = <GridBoard rows={level.rows} cols={level.cols} feedback={{ sequence: level.sequence, taps: phase.taps }} />;
        bottom = (
          <p role="status" className={`text-lg font-semibold ${phase.result.passed ? "text-emerald-600" : "text-red-500"}`}>
            {phase.result.passed ? "Level passed" : "Not quite"} · +{phase.result.points} points · shapes {phase.result.distractorCorrect}/
            {phase.result.distractorTotal}
          </p>
        );
        break;
      case "sessionOver":
        centre = <Results state={state} onPlayAgain={onPlayAgain} />;
        break;
    }
  }

  return (
    // Width = the smaller of the page width and the height left after the nav,
    // top bar and bottom bar (~15rem), so the whole game fits without scrolling.
    <div className="flex w-full max-w-[max(18rem,min(calc(100dvh_-_15rem),100%))] flex-col items-center gap-4">
      <Hud state={state} now={now} onPause={game.pause} />
      {/* The play area: one square that never changes size or position. */}
      <div className="aspect-square w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
        {centre}
      </div>
      <footer className="flex min-h-16 w-full items-center justify-center">{bottom}</footer>
    </div>
  );
}
