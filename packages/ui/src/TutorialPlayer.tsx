"use client";

/**
 * Coach-mark tutorial player shared by every game (PLAN.md → "Tutorial and
 * onboarding"). It knows nothing about any game:
 * - the game passes its steps as data plus `renderStage`, which draws the demo
 *   for a step;
 * - the player dims everything except the element whose data-tutorial attribute
 *   matches `step.target`, and shows the caption beside it with an arrow;
 * - Back / Next / Skip at the bottom; ← / → / Enter / Esc work too.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { TutorialStep } from "@cogniarena/game-core";

export interface TutorialPlayerProps {
  steps: TutorialStep[];
  renderStage: (step: TutorialStep, index: number) => ReactNode;
  onFinish: () => void;
  onSkip?: () => void;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;

export function TutorialPlayer({ steps, renderStage, onFinish, onSkip }: TutorialPlayerProps) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const step = steps[index]!;
  const last = index === steps.length - 1;

  // Keep the spotlight on the target, even while the demo moves things around.
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      const stage = stageRef.current;
      const el = stage?.querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`);
      if (stage && el) {
        const s = stage.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const next = { top: r.top - s.top - PAD, left: r.left - s.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
        setBox((prev) =>
          prev && Math.abs(prev.top - next.top) + Math.abs(prev.left - next.left) + Math.abs(prev.width - next.width) + Math.abs(prev.height - next.height) < 1
            ? prev
            : next,
        );
      } else setBox(null);
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [step.target, index]);

  const next = useCallback(() => (last ? onFinish() : setIndex((i) => i + 1)), [last, onFinish]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const skip = onSkip ?? onFinish;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, skip]);

  const stageHeight = stageRef.current?.clientHeight ?? 0;
  const captionBelow = box ? box.top + box.height / 2 < stageHeight / 2 : true;

  return (
    <div className="flex w-full max-w-[max(18rem,min(calc(100dvh_-_15rem),100%))] flex-col gap-4">
      <div ref={stageRef} className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
        {/* The demo itself is not interactive during the walkthrough. */}
        <div key={index} className="pointer-events-none h-full w-full" aria-hidden>
          {renderStage(step, index)}
        </div>

        {box && (
          <>
            {/* Spotlight: a transparent box whose huge shadow dims everything else. */}
            <div
              className="pointer-events-none absolute rounded-xl ring-2 ring-indigo-400 motion-safe:transition-all motion-safe:duration-300"
              style={{ ...box, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)" }}
            />
            <div
              role="dialog"
              aria-live="polite"
              aria-label={`Step ${index + 1} of ${steps.length}`}
              className="absolute right-3 left-3 flex flex-col items-center motion-safe:transition-all motion-safe:duration-300"
              style={captionBelow ? { top: Math.min(box.top + box.height + 8, stageHeight - 96) } : { bottom: Math.min(stageHeight - box.top + 8, stageHeight - 96) }}
            >
              {captionBelow && <Arrow up />}
              <p className="max-w-sm rounded-xl bg-indigo-600 px-4 py-3 text-center text-base font-medium text-white shadow-lg">{step.caption}</p>
              {!captionBelow && <Arrow up={false} />}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={index === 0}
          className="rounded-xl bg-zinc-200 px-5 py-3 font-medium hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          Back
        </button>
        <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {index + 1} / {steps.length}
        </span>
        <span className="flex gap-2">
          <button type="button" onClick={skip} className="rounded-xl px-4 py-3 font-medium text-zinc-600 hover:underline dark:text-zinc-300">
            Skip
          </button>
          <button type="button" onClick={next} autoFocus className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500">
            {last ? "Start practice" : "Next"}
          </button>
        </span>
      </div>
    </div>
  );
}

function Arrow({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 20 12" className={`h-3 w-5 fill-indigo-600 motion-safe:animate-bounce ${up ? "" : "rotate-180"}`} aria-hidden>
      <path d="M10 0 20 12H0z" />
    </svg>
  );
}
