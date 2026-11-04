"use client";

/**
 * The Play screen (PLAN.md → "Screens"): top bar (level, balls left, timer,
 * pause), a fixed-size square in the centre whose content changes by phase, and
 * a bottom bar with Yes/No or Undo/Clear/Submit. Nothing moves between phases.
 *
 * Keyboard: Y / ← = Yes, N / → = No, Backspace = Undo, Esc = Pause.
 *
 * The parent hears about progress through callbacks: `onLevelComplete` for each
 * scored level (the web app sends it to the server) and `onSessionOver`.
 */
import { useEffect, useRef, type ReactNode } from "react";
import type { GridRecallConfig, GridRecallResult, ShapeTask } from "../engine";
import { remainingMs, summarise, type LevelSubmission, type SessionState } from "../machine";
import { GridBoard } from "./GridBoard";
import { ShapeQuestion } from "./ShapeQuestion";
import { sounds } from "./sound";
import { useGridRecallSession } from "./useGridRecallSession";

export type PlayMode = "assessment" | "practice" | "tutorial";

export interface GridRecallPlayProps {
  seed: string;
  mode: PlayMode;
  config?: GridRecallConfig;
  /** null = untimed. */
  durationMs: number | null;
  /** Tutorial: show right/wrong after each answer for this long. */
  answerFeedbackMs?: number;
  sound?: boolean;
  onPlayAgain: () => void;
  onLevelComplete?: (submission: LevelSubmission, result: GridRecallResult) => void;
  onSessionOver?: (state: SessionState) => void;
  /** Shown under the in-game results, e.g. a link to the saved results page. */
  resultsFooter?: ReactNode;
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

/** Plain-language explanation of a shape answer, for the tutorial. */
export function explainTask(task: ShapeTask): string {
  const angle = `${task.turns * 90}°`;
  return task.answer === "yes"
    ? `It's the same shape turned ${angle}.`
    : `It's a mirror image (then turned ${angle}), so no rotation lines it up.`;
}

function ballsBlinked(state: SessionState): number {
  const { phase, level } = state;
  switch (phase.name) {
    case "idle":
    case "countdown":
      return 0;
    case "blink":
      return phase.index;
    case "distractor":
    case "answered":
      return phase.index + 1;
    default:
      return level.sequence.length;
  }
}

function Hud(props: { state: SessionState; now: number; onPause: () => void; onFinish: () => void }) {
  const { state, now } = props;
  const { phase, level } = state;
  const blinked = ballsBlinked(state);
  const left = remainingMs(state, now);
  const active = phase.name !== "idle" && phase.name !== "sessionOver";
  return (
    <header className="flex w-full items-center justify-between gap-3 text-sm sm:text-base">
      <span className="font-semibold">Level {level.level}</span>
      <span className="flex gap-1.5" aria-label={`${level.sequence.length - blinked} balls left`}>
        {level.sequence.map((_, i) => (
          <span key={i} className={`size-2.5 rounded-full ${i < blinked ? "bg-zinc-300 dark:bg-zinc-700" : "bg-indigo-500"}`} />
        ))}
      </span>
      <span className="flex items-center gap-2">
        <span data-tutorial="session-timer" className="font-mono text-xl tabular-nums sm:text-2xl" aria-label="time left">
          {left === null ? "Untimed" : formatClock(left)}
        </span>
        <button type="button" onClick={props.onPause} disabled={!active} className={`${btn.secondary} px-3 py-1.5 text-sm`}>
          Pause
        </button>
        {state.durationMs === null && (
          <button type="button" onClick={props.onFinish} disabled={!active} className={`${btn.secondary} px-3 py-1.5 text-sm`}>
            Finish
          </button>
        )}
      </span>
    </header>
  );
}

function Results({ state, onPlayAgain, footer }: { state: SessionState; onPlayAgain: () => void; footer?: ReactNode }) {
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
      {state.history.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-1">Level</th>
              <th>Recall</th>
              <th>Shapes</th>
              <th>Points</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.history.map((r, i) => (
              <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1">{r.level}</td>
                <td>
                  {r.recallCorrect}/{r.balls}
                </td>
                <td>
                  {r.distractorCorrect}/{r.distractorTotal}
                </td>
                <td>{r.points}</td>
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

export function GridRecallPlay(props: GridRecallPlayProps) {
  const { seed, mode, config, durationMs, answerFeedbackMs, sound = false, onPlayAgain, onLevelComplete, onSessionOver } = props;
  const game = useGridRecallSession({ seed, config, durationMs, answerFeedbackMs });
  const { state, now } = game;
  const { phase, level } = state;
  const paused = state.pausedAt !== null;

  // Report each scored level exactly once, and the end of the session.
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
    // Only when the session ends, not on every later render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  // Sound: tick on each blink.
  const blinkKey = phase.name === "blink" ? `${state.attempt}-${phase.index}` : null;
  useEffect(() => {
    if (sound && blinkKey) sounds.tick();
  }, [sound, blinkKey]);

  const answer = (a: "yes" | "no") => {
    if (sound) sounds.click();
    game.answer(a);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return void (paused ? game.resume() : game.pause());
      if (phase.name === "distractor") {
        if (e.key === "y" || e.key === "Y" || e.key === "ArrowLeft") answer("yes");
        if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") answer("no");
      }
      if (phase.name === "recall" && e.key === "Backspace") game.undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let centre: ReactNode;
  let bottom: ReactNode = null;

  if (paused) {
    centre = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-2xl font-semibold">Paused</p>
        <p className="text-zinc-500 dark:text-zinc-400">The timer is stopped. This level restarts with a new pattern when you resume.</p>
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
        centre = <GridBoard rows={level.rows} cols={level.cols} />;
        bottom = (
          <button type="button" className={btn.primary} onClick={game.start} autoFocus>
            Start {mode === "tutorial" ? "practice round" : mode}
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
            <button type="button" className={`${btn.answer} bg-indigo-600 hover:bg-indigo-500`} onClick={() => answer("yes")}>
              Yes <span className="text-sm opacity-70">(Y)</span>
            </button>
            <button type="button" className={`${btn.answer} bg-zinc-700 hover:bg-zinc-600`} onClick={() => answer("no")}>
              No <span className="text-sm opacity-70">(N)</span>
            </button>
          </div>
        );
        break;
      case "answered": {
        const task = level.tasks[phase.index]!;
        centre = <ShapeQuestion task={task} shownAt={0} endsAt={0} now={0} />;
        const tone = phase.correct ? "text-emerald-600" : "text-red-500";
        const head = phase.correct === null ? "Time's up." : phase.correct ? "Correct!" : "Not quite.";
        bottom = (
          <p role="status" className={`text-center text-lg font-semibold ${tone}`}>
            {head} <span className="font-normal text-zinc-600 dark:text-zinc-300">{explainTask(task)}</span>
          </p>
        );
        break;
      }
      case "recall":
        centre = <GridBoard rows={level.rows} cols={level.cols} taps={phase.taps} onTap={game.tap} />;
        bottom = (
          <div data-tutorial="recall-controls" className="flex w-full items-center gap-3">
            <button type="button" className={btn.secondary} onClick={game.undo} disabled={!phase.taps.length}>
              Undo
            </button>
            <button type="button" className={btn.secondary} onClick={game.clear} disabled={!phase.taps.length}>
              Clear
            </button>
            <span className="flex-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {phase.taps.length}/{level.sequence.length} tapped
            </span>
            <button type="button" className={btn.primary} onClick={game.submit} disabled={!phase.taps.length}>
              Submit
            </button>
          </div>
        );
        break;
      case "feedback":
        centre = <GridBoard rows={level.rows} cols={level.cols} feedback={{ sequence: level.sequence, taps: phase.taps }} />;
        bottom = (
          <p role="status" className={`text-lg font-semibold ${phase.result.passed ? "text-emerald-600" : "text-red-500"}`}>
            {phase.result.passed ? "Level passed" : "Not quite"} · +{phase.result.points} points · shapes{" "}
            {phase.result.distractorCorrect}/{phase.result.distractorTotal}
          </p>
        );
        break;
      case "sessionOver":
        centre = <Results state={state} onPlayAgain={onPlayAgain} footer={props.resultsFooter} />;
        break;
    }
  }

  return (
    // Width = the smaller of the page width and the height left after the nav,
    // top bar and bottom bar (~15rem), so the whole game fits without scrolling.
    <div className="flex w-full max-w-[max(18rem,min(calc(100dvh_-_15rem),100%))] flex-col items-center gap-4">
      <Hud state={state} now={now} onPause={game.pause} onFinish={game.finish} />
      {/* The play area: one square that never changes size or position. */}
      <div className="aspect-square w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
        {centre}
      </div>
      <footer className="flex min-h-16 w-full items-center justify-center">{bottom}</footer>
    </div>
  );
}
