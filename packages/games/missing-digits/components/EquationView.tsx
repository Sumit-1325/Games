"use client";

/**
 * The equation: digit boxes, operators and "= target". Boxes are buttons, so
 * the player can tap one to choose where the next digit goes.
 * `tone` colours the whole equation after Submit.
 */
import type { Op } from "../engine";

export function EquationView(props: {
  digits: (number | null)[];
  ops: Op[];
  target: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
  tone?: "right" | "wrong" | null;
  /** Briefly highlights a box (the demo's "typing" cursor). */
  highlight?: number | null;
}) {
  const { digits, ops, target, selected = null, onSelect, tone = null, highlight = null } = props;
  const boxTone =
    tone === "right"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300"
      : tone === "wrong"
        ? "bg-red-50 text-red-700 ring-red-500 dark:bg-red-950/50 dark:text-red-300"
        : "";
  return (
    <div
      data-tutorial="equation"
      data-ops={ops.join(",")}
      data-target={target}
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-3xl font-bold tabular-nums sm:gap-x-3 sm:text-5xl"
      role="group"
      aria-label={`Equation with ${digits.length} blanks, equals ${target}`}
    >
      {digits.map((d, i) => {
        const active = tone === null && (selected === i || highlight === i);
        return (
          <span key={i} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onSelect?.(i)}
              disabled={!onSelect}
              aria-label={`Box ${i + 1}${d === null ? ", empty" : `, ${d}`}`}
              aria-pressed={selected === i}
              className={`flex size-14 items-center justify-center rounded-2xl ring-2 transition sm:size-20 ${
                boxTone ||
                (active
                  ? "bg-indigo-50 text-indigo-700 ring-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200"
                  : d === null
                    ? "bg-zinc-100 ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700"
                    : "bg-white ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-600")
              }`}
            >
              {d ?? ""}
            </button>
            {i < ops.length && <span className="text-zinc-500 dark:text-zinc-400">{ops[i] === "-" ? "−" : ops[i]}</span>}
          </span>
        );
      })}
      <span className="text-zinc-500 dark:text-zinc-400">=</span>
      <span className="min-w-14 text-center text-indigo-600 sm:min-w-20 dark:text-indigo-400">{target}</span>
    </div>
  );
}

/** Digits 1–9; digits already in the equation are dimmed (tapping one moves it). */
export function Keypad(props: { used: (number | null)[]; onDigit: (d: number) => void; disabled?: boolean }) {
  return (
    <div data-tutorial="keypad" className="grid w-full grid-cols-9 gap-1.5 sm:gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const used = props.used.includes(d);
        return (
          <button
            key={d}
            type="button"
            disabled={props.disabled}
            onClick={() => props.onDigit(d)}
            aria-label={`Digit ${d}${used ? " (used)" : ""}`}
            className={`h-12 rounded-xl text-xl font-semibold tabular-nums transition sm:h-14 sm:text-2xl ${
              used
                ? "bg-zinc-200 text-zinc-400 line-through decoration-2 dark:bg-zinc-800/40 dark:text-zinc-600"
                : "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300 hover:bg-indigo-50 hover:ring-indigo-400 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-indigo-950"
            } disabled:opacity-40`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
