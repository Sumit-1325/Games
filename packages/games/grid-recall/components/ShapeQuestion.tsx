"use client";

/**
 * The distractor: original shape on the left, rotated-or-mirrored copy on the
 * right, and a countdown ring. The Yes/No buttons live in the Play screen's
 * bottom bar so they never move.
 */
import type { Shape, ShapeTask } from "../engine";

export function ShapeView({
  shape,
  span,
  label,
  tutorialId,
  rotateDeg = 0,
}: {
  shape: Shape;
  span: number;
  label: string;
  tutorialId: string;
  /** Tutorial demo: visibly turn the drawn shape (around its centre). */
  rotateDeg?: number;
}) {
  const h = Math.max(...shape.map((c) => c.row)) + 1;
  const w = Math.max(...shape.map((c) => c.col)) + 1;
  // Centre the shape in a span×span box so both sides use the same scale.
  const dx = (span - w) / 2;
  const dy = (span - h) / 2;
  return (
    <figure data-tutorial={tutorialId} className="flex flex-1 flex-col items-center gap-2">
      <svg
        viewBox={`-0.5 -0.5 ${span + 1} ${span + 1}`}
        className="aspect-square w-full max-w-56 text-indigo-500 motion-safe:transition-transform motion-safe:duration-1000"
        style={rotateDeg ? { transform: `rotate(${rotateDeg}deg)` } : undefined}
        role="img"
        aria-label={label}
      >
        {shape.map((c) => (
          <rect
            key={`${c.row}-${c.col}`}
            x={c.col + dx + 0.04}
            y={c.row + dy + 0.04}
            width={0.92}
            height={0.92}
            rx={0.15}
            className="fill-current"
          />
        ))}
      </svg>
      <figcaption className="text-sm text-zinc-500 dark:text-zinc-400">{label}</figcaption>
    </figure>
  );
}

function TimerRing({ fraction }: { fraction: number }) {
  const r = 18;
  const circumference = 2 * Math.PI * r;
  return (
    <svg data-tutorial="timer" viewBox="0 0 44 44" className="size-11 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} strokeWidth="4" className="fill-none stroke-zinc-200 dark:stroke-zinc-700" />
      <circle
        cx="22"
        cy="22"
        r={r}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        className={`fill-none ${fraction < 0.25 ? "stroke-red-500" : "stroke-indigo-500"}`}
      />
    </svg>
  );
}

export function ShapeQuestion({ task, shownAt, endsAt, now }: { task: ShapeTask; shownAt: number; endsAt: number; now: number }) {
  const span = Math.max(...[...task.left, ...task.right].flatMap((c) => [c.row + 1, c.col + 1]));
  // No ring when there's no time window (tutorial demos, the "answered" step).
  const fraction = endsAt > shownAt ? Math.max(0, Math.min(1, (endsAt - now) / (endsAt - shownAt))) : null;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 motion-safe:animate-fade-in">
      <div className="flex w-full items-center gap-4 sm:gap-8">
        <ShapeView shape={task.left} span={span} label="Original" tutorialId="shape-left" />
        <ShapeView shape={task.right} span={span} label="Is this the same, only rotated?" tutorialId="shape-right" />
      </div>
      <div className="flex items-center gap-3">
        {fraction !== null && <TimerRing fraction={fraction} />}
        <p className="text-base font-medium sm:text-lg">Is the right shape the left one, just rotated?</p>
      </div>
    </div>
  );
}
