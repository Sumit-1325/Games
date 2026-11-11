"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureSession } from "@/lib/auth-client";

const sizes = [3, 4, 5, 6, 7, 8];
const field = "rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800";
const card = "flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800";

export function LobbyOptions({
  slug,
  demoBlurb,
  practiceGridSize,
}: {
  slug: string;
  demoBlurb: string;
  practiceGridSize?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeMode, setActiveMode] = useState<"assessment" | "practice" | null>(null);

  const [minutes, setMinutes] = useState("6");
  const [rows, setRows] = useState("5");
  const [cols, setCols] = useState("5");

  // Prewarm guest session and prefetch the play route as soon as lobby opens
  useEffect(() => {
    ensureSession().catch(() => {});
    router.prefetch(`/games/${slug}/play?mode=assessment&minutes=6`);
    router.prefetch(`/games/${slug}/play?mode=practice`);
  }, [router, slug]);

  const handleStart = (mode: "assessment" | "practice") => {
    if (isPending) return;
    setActiveMode(mode);

    const query = new URLSearchParams();
    query.set("mode", mode);
    if (mode === "assessment") {
      query.set("minutes", minutes);
    } else if (practiceGridSize) {
      query.set("rows", rows);
      query.set("cols", cols);
    }

    startTransition(() => {
      router.push(`/games/${slug}/play?${query.toString()}`);
    });
  };

  return (
    <>
      {/* Assessment Form Card */}
      <div className={card}>
        <div>
          <h2 className="text-lg font-semibold">Assessment</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{demoBlurb}</p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Session length
          <select
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={isPending}
            className={field}
          >
            <option value="6">6 min</option>
            <option value="9">9 min</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => handleStart("assessment")}
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && activeMode === "assessment" ? (
            <>
              <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Starting assessment…</span>
            </>
          ) : (
            "Start assessment"
          )}
        </button>
      </div>

      {/* Practice Form Card */}
      <div className={card}>
        <div>
          <h2 className="font-semibold">Practice</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No timer{practiceGridSize ? ", and you pick the grid size" : ""}. Saved to history, not ranked.
          </p>
        </div>
        {practiceGridSize && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Rows
                <select
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  disabled={isPending}
                  className={field}
                >
                  {sizes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Columns
                <select
                  value={cols}
                  onChange={(e) => setCols(e.target.value)}
                  disabled={isPending}
                  className={field}
                >
                  {sizes.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="-mt-2 text-xs text-zinc-500">On phones, grids above 6×6 get small: 6×6 or less plays best.</p>
          </>
        )}
        <button
          type="button"
          onClick={() => handleStart("practice")}
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-200 px-6 py-3 font-semibold transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          {isPending && activeMode === "practice" ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-zinc-700 border-t-transparent dark:border-zinc-300" />
              <span>Starting practice…</span>
            </>
          ) : (
            "Start practice"
          )}
        </button>
      </div>
    </>
  );
}

