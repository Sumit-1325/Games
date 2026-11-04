"use client";

/**
 * The short demo that plays automatically before an assessment, like the real test.
 *   1. a ball blinks ("remember where"),
 *   2. the app answers a Yes example itself: the right shape turns back and lines up,
 *   3. the app answers a No example: a mirror image turns back but never lines up,
 *   4. the player answers one question on their own and sees if they were right,
 *   5. Start begins the timed session.
 * Nothing here is scored or saved.
 */
import { useEffect, useMemo, useState } from "react";
import { randomSeed } from "@cogniarena/game-core";
import { prefersReducedMotion } from "@cogniarena/ui";
import { generateLevel, type Answer, type ShapeTask } from "../engine";
import { tutorialConfig } from "../tutorial";
import { explainTask } from "./GridRecallPlay";
import { GridBoard } from "./GridBoard";
import { ShapeQuestion, ShapeView } from "./ShapeQuestion";

type Step = "ready" | "blink" | "show-yes" | "show-no" | "try" | "answered";

const BLINK_DELAY_MS = 900;
const BLINK_MS = 1200;
/** Show-me examples: shapes appear, then the right one turns back, then the answer lights up. */
const TURN_AT_MS = 1200;
const VERDICT_AT_MS = 2600;

const answerBtn = "min-h-14 flex-1 rounded-xl text-lg font-semibold text-white";

/** Counts how many of `marks` (ms after `key` changed) have passed; 0 right after a change. */
function useElapsedStage(key: string, marks: number[]) {
  const [s, setS] = useState({ key, stage: 0 });
  useEffect(() => {
    const timers = marks.map((ms, i) => setTimeout(() => setS({ key, stage: i + 1 }), ms));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return s.key === key ? s.stage : 0;
}

/** The app answers one example while the player watches. stage: 0 shown, 1 turned back, 2 answer. */
function ShowMe({ task, stage, reduced }: { task: ShapeTask; stage: number; reduced: boolean }) {
  const turned = stage >= 1;
  const verdict = stage >= 2;
  const span = Math.max(...[...task.left, ...task.right].flatMap((c) => [c.row + 1, c.col + 1]));
  const yes = task.answer === "yes";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <div className="flex w-full items-center gap-4 sm:gap-8">
        <ShapeView shape={task.left} span={span} label="Original" tutorialId="shape-left" />
        <ShapeView
          shape={task.right}
          span={span}
          label={turned ? `Turned back ${task.turns * 90}°` : "Right shape"}
          tutorialId="shape-right"
          rotateDeg={turned && !reduced ? -task.turns * 90 : 0}
        />
      </div>
      <p className="min-h-14 text-center text-base font-medium sm:text-lg">
        {!turned
          ? "Watch: we turn the right shape back…"
          : !verdict
            ? yes
              ? "…and it lines up with the original."
              : "…but it never lines up: it's flipped like a mirror image."
            : yes
              ? "Same shape, only rotated → answer Yes."
              : "Mirror image → answer No."}
      </p>
    </div>
  );
}

export function GridRecallWarmUp({ onStart, startLabel = "Start" }: { onStart: () => void; startLabel?: string }) {
  // Tutorial config has 2 balls → one "yes" and one "no" task, used as the two show-me examples.
  const { cell, yesTask, noTask, tryTask } = useMemo(() => {
    const seed = randomSeed();
    const demo = generateLevel(`${seed}:demo`, 1, tutorialConfig);
    const own = generateLevel(`${seed}:try`, 1, tutorialConfig);
    return {
      cell: demo.sequence[0]!,
      yesTask: demo.tasks.find((t) => t.answer === "yes")!,
      noTask: demo.tasks.find((t) => t.answer === "no")!,
      tryTask: own.tasks[0]!,
    };
  }, []);
  const [step, setStep] = useState<Step>("ready");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const reduced = prefersReducedMotion();
  const showStage = useElapsedStage(step, step === "show-yes" || step === "show-no" ? (reduced ? [0, 600] : [TURN_AT_MS, VERDICT_AT_MS]) : []);

  // ready → blink → show-yes, on a timer.
  useEffect(() => {
    if (step === "ready") {
      const t = setTimeout(() => setStep("blink"), BLINK_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (step === "blink") {
      const t = setTimeout(() => setStep("show-yes"), BLINK_MS);
      return () => clearTimeout(t);
    }
  }, [step]);

  const choose = (a: Answer) => {
    setAnswer(a);
    setStep("answered");
  };

  useEffect(() => {
    if (step !== "try") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y" || e.key === "ArrowLeft") choose("yes");
      if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") choose("no");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const showing = step === "show-yes" || step === "show-no";
  const example = step === "show-yes" ? yesTask : noTask;
  const verdict = showing && showStage >= 2;
  const correct = answer === tryTask.answer;

  const caption: Record<Step, string> = {
    ready: "Watch the grid: a ball will blink.",
    blink: "Remember where the ball blinked.",
    "show-yes": "Example 1 of 2: we answer this one for you.",
    "show-no": "Example 2 of 2: we answer this one for you.",
    try: "Your turn: is the right shape the left one, only rotated?",
    answered: "In the test you'll see more blinks, each followed by a shape question. Then tap the cells in the order they blinked.",
  };

  return (
    <div className="flex w-full max-w-[max(18rem,min(calc(100dvh_-_15rem),100%))] flex-col items-center gap-4">
      <header className="flex w-full items-center justify-between text-sm sm:text-base">
        <span className="font-semibold">Demo</span>
        <span className="text-zinc-500 dark:text-zinc-400">Not scored</span>
      </header>
      <p className="min-h-12 text-center text-zinc-600 dark:text-zinc-300">{caption[step]}</p>
      <div className="aspect-square w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
        {step === "ready" && <GridBoard rows={3} cols={3} />}
        {step === "blink" && <GridBoard rows={3} cols={3} lit={cell} />}
        {showing && <ShowMe key={step} task={example} stage={showStage} reduced={reduced} />}
        {(step === "try" || step === "answered") && <ShapeQuestion task={tryTask} shownAt={0} endsAt={0} now={0} />}
      </div>
      <footer className="flex min-h-16 w-full flex-col items-center justify-center gap-3">
        {showing && (
          <>
            <div className="flex w-full gap-3" aria-hidden>
              {(["yes", "no"] as const).map((a) => (
                <span
                  key={a}
                  className={`${answerBtn} flex items-center justify-center transition ${
                    verdict && example.answer === a
                      ? `${a === "yes" ? "bg-indigo-600" : "bg-zinc-700"} ring-4 ring-indigo-300 motion-safe:animate-pulse`
                      : "bg-zinc-400/50 dark:bg-zinc-700/50"
                  }`}
                >
                  {a === "yes" ? "Yes" : "No"}
                </span>
              ))}
            </div>
            <button
              type="button"
              disabled={!verdict}
              onClick={() => setStep(step === "show-yes" ? "show-no" : "try")}
              className="w-full rounded-xl bg-zinc-200 px-6 py-3 font-semibold hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              {step === "show-yes" ? "Next example" : "Now you try"}
            </button>
          </>
        )}
        {step === "try" && (
          <div className="flex w-full gap-3">
            <button type="button" onClick={() => choose("yes")} className={`${answerBtn} bg-indigo-600 hover:bg-indigo-500`}>
              Yes <span className="text-sm opacity-70">(Y)</span>
            </button>
            <button type="button" onClick={() => choose("no")} className={`${answerBtn} bg-zinc-700 hover:bg-zinc-600`}>
              No <span className="text-sm opacity-70">(N)</span>
            </button>
          </div>
        )}
        {step === "answered" && (
          <>
            <p role="status" className={`text-center text-lg font-semibold ${correct ? "text-emerald-600" : "text-red-500"}`}>
              {correct ? "Correct!" : "Not quite."} <span className="font-normal text-zinc-600 dark:text-zinc-300">{explainTask(tryTask)}</span>
            </p>
            <button type="button" onClick={onStart} autoFocus className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-500">
              {startLabel}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
