"use client";

/**
 * The automatic demo before an assessment, like Grid Recall's:
 *   1. the app solves an example while the player watches (□ + □ × □ = 11 → 3 + 4 × 2),
 *      and explains that × comes before +;
 *   2. the player solves one small equation on their own and sees if it was right;
 *   3. Start begins the timed session.
 * Nothing here is scored or saved.
 */
import { useEffect, useMemo, useState } from "react";
import { randomSeed } from "@cogniarena/game-core";
import { prefersReducedMotion } from "@cogniarena/ui";
import { formatEquation, generateLevel, isSolution, type Op } from "../engine";
import { EquationView, Keypad } from "./EquationView";

const EXAMPLE = { ops: ["+", "×"] as Op[], target: 11, digits: [3, 4, 2] };
/** When each example digit drops in, and when the explanation shows (ms). */
const FILL_AT = [1400, 2200, 3000];
const EXPLAIN_AT = 3900;

type Step = "show" | "try" | "answered";

export function MissingDigitsWarmUp({ onStart, startLabel = "Start" }: { onStart: () => void; startLabel?: string }) {
  const own = useMemo(() => generateLevel(`${randomSeed()}:try`, 1), []);
  const [step, setStep] = useState<Step>("show");
  const [shown, setShown] = useState(0); // example digits filled so far; 4 = explained
  const [digits, setDigits] = useState<(number | null)[]>([null, null]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (step !== "show") return;
    const marks = prefersReducedMotion() ? [0, 0, 0, 0] : [...FILL_AT, EXPLAIN_AT];
    const timers = marks.map((ms, i) => setTimeout(() => setShown(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const put = (d: number) => {
    const next = digits.map((x) => (x === d ? null : x));
    next[selected] = d;
    setDigits(next);
    const empty = next.findIndex((x) => x === null);
    if (empty !== -1) setSelected(empty);
  };
  const correct = isSolution(digits, own.ops, own.target);

  useEffect(() => {
    if (step !== "try") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[1-9]$/.test(e.key)) put(Number(e.key));
      else if (e.key === "Enter" && digits.every((d) => d !== null)) setStep("answered");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const exampleDigits = EXAMPLE.digits.map((d, i) => (i < shown ? d : null));
  const explained = shown > EXAMPLE.digits.length;
  const caption =
    step === "show"
      ? "Example: we solve this one for you."
      : step === "try"
        ? "Your turn: fill both boxes so the sum is right."
        : "In the test, equations get longer and use − × ÷ too. Any answer that works counts.";

  return (
    <div className="flex w-full max-w-[max(18rem,min(calc(100dvh_-_15rem),100%))] flex-col items-center gap-4">
      <header className="flex w-full items-center justify-between text-sm sm:text-base">
        <span className="font-semibold">Demo</span>
        <span className="text-zinc-500 dark:text-zinc-400">Not scored</span>
      </header>
      <p className="min-h-12 text-center text-zinc-600 dark:text-zinc-300">{caption}</p>
      <div className="aspect-square w-full rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5 dark:bg-zinc-900 dark:ring-zinc-800">
        {step === "show" ? (
          <div className="flex h-full flex-col items-center justify-center gap-8">
            <EquationView
              digits={exampleDigits}
              ops={EXAMPLE.ops}
              target={EXAMPLE.target}
              highlight={shown < EXAMPLE.digits.length ? shown : null}
              tone={explained ? "right" : null}
            />
            <p className="min-h-20 max-w-sm text-center text-lg">
              {!explained ? (
                "Fill each box with a digit from 1 to 9. Each digit only once."
              ) : (
                <>
                  <span className="font-semibold">× comes before +:</span> 4 × 2 = 8, then <span className="whitespace-nowrap">3 + 8 = 11 ✓</span>
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-8">
            <EquationView
              digits={digits}
              ops={own.ops}
              target={own.target}
              selected={step === "try" ? selected : null}
              onSelect={step === "try" ? setSelected : undefined}
              tone={step === "answered" ? (correct ? "right" : "wrong") : null}
            />
            {step === "try" ? (
              <Keypad used={digits} onDigit={put} />
            ) : (
              !correct && (
                <p className="text-center text-zinc-600 dark:text-zinc-300">
                  One answer: <span className="font-mono font-semibold">{formatEquation(own.example, own.ops, own.target)}</span>
                </p>
              )
            )}
          </div>
        )}
      </div>
      <footer className="flex min-h-16 w-full flex-col items-center justify-center gap-3">
        {step === "show" && (
          <button
            type="button"
            disabled={!explained}
            onClick={() => setStep("try")}
            className="w-full rounded-xl bg-zinc-200 px-6 py-3 font-semibold hover:bg-zinc-300 disabled:opacity-40 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            Now you try
          </button>
        )}
        {step === "try" && (
          <button
            type="button"
            disabled={digits.some((d) => d === null)}
            onClick={() => setStep("answered")}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Check
          </button>
        )}
        {step === "answered" && (
          <>
            <p role="status" className={`text-center text-lg font-semibold ${correct ? "text-emerald-600" : "text-red-500"}`}>
              {correct ? "Correct!" : "Not quite."}
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
