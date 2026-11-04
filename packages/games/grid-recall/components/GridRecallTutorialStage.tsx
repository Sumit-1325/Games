"use client";

/**
 * The demo drawn behind each coach-mark step of the Grid Recall tutorial
 * (steps are data in ../tutorial.ts; the shared TutorialPlayer spotlights them).
 * Each step's `id` picks what to show; demos loop so a slow reader still sees them.
 */
import { useEffect, useState } from "react";
import type { Cell, TutorialStep } from "@cogniarena/game-core";
import { prefersReducedMotion } from "@cogniarena/ui";
import { L_TETROMINO, mirror, rotate, type ShapeTask } from "../engine";
import { GridBoard } from "./GridBoard";
import { ShapeQuestion, ShapeView } from "./ShapeQuestion";

const YES_TASK: ShapeTask = { left: L_TETROMINO, right: rotate(L_TETROMINO, 1), turns: 1, mirrored: false, answer: "yes" };
const NO_TASK: ShapeTask = { left: L_TETROMINO, right: rotate(mirror(L_TETROMINO), 1), turns: 1, mirrored: true, answer: "no" };
const DEMO_SEQUENCE: Cell[] = [
  { row: 1, col: 1 },
  { row: 0, col: 2 },
];

/** Counts up every `ms`; restarts per step because the stage remounts. */
function useTicker(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

function BlinkDemo() {
  const n = useTicker(900);
  return <GridBoard rows={3} cols={3} lit={n % 2 === 0 ? DEMO_SEQUENCE[0] : null} />;
}

function RotateDemo({ task }: { task: ShapeTask }) {
  // Rotate the right shape back by its turn: a rotation lines up, a mirror never does.
  const reduced = prefersReducedMotion();
  const n = useTicker(1800);
  const turned = n % 2 === 1;
  const span = 3;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="flex w-full items-center gap-6">
        <ShapeView shape={task.left} span={span} label="Original" tutorialId="shape-left" />
        <ShapeView
          shape={task.right}
          span={span}
          label={reduced ? `Turn back ${task.turns * 90}°` : turned ? "Turned back" : "Right shape"}
          tutorialId="shape-right"
          rotateDeg={!reduced && turned ? -task.turns * 90 : 0}
        />
      </div>
      <div className="flex w-full gap-3">
        {(["yes", "no"] as const).map((a) => (
          <span
            key={a}
            className={`flex-1 rounded-xl py-3 text-center text-lg font-semibold text-white ${
              task.answer === a ? "bg-indigo-600 ring-4 ring-indigo-300 motion-safe:animate-pulse" : "bg-zinc-500/60"
            }`}
          >
            {a === "yes" ? "Yes" : "No"}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimerDemo() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const loop = () => {
      setNow((performance.now() - start) % 5000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <ShapeQuestion task={YES_TASK} shownAt={0} endsAt={5000} now={now} />;
}

function RecallDemo({ withControls }: { withControls: boolean }) {
  const n = useTicker(800);
  const taps = DEMO_SEQUENCE.slice(0, n % (DEMO_SEQUENCE.length + 2));
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="min-h-0 flex-1">
        <GridBoard rows={3} cols={3} taps={taps} />
      </div>
      {withControls && (
        <div data-tutorial="recall-controls" className="flex gap-2">
          <span className="rounded-xl bg-zinc-200 px-4 py-2 dark:bg-zinc-800">Undo</span>
          <span className="rounded-xl bg-zinc-200 px-4 py-2 dark:bg-zinc-800">Clear</span>
          <span className="flex-1" />
          <span className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Submit</span>
        </div>
      )}
    </div>
  );
}

export function GridRecallTutorialStage({ step }: { step: TutorialStep }) {
  switch (step.id) {
    case "grid":
      return <BlinkDemo />;
    case "order":
      return <GridBoard rows={3} cols={3} taps={[DEMO_SEQUENCE[0]!]} />;
    case "shape-left":
    case "shape-right":
      return <ShapeQuestion task={YES_TASK} shownAt={0} endsAt={0} now={0} />;
    case "show-yes":
      return <RotateDemo task={YES_TASK} />;
    case "show-no":
      return <RotateDemo task={NO_TASK} />;
    case "timer":
      return <TimerDemo />;
    case "recall":
      return <RecallDemo withControls={false} />;
    case "controls":
      return <RecallDemo withControls />;
    default:
      return <GridBoard rows={3} cols={3} />;
  }
}
