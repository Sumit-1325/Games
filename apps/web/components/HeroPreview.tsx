/**
 * Landing-page preview of Grid Recall: balls blink one after another on a 4×4
 * grid (pure CSS animation), next to a shape question. Decorative only.
 * With reduced motion the three balls are shown at once, numbered.
 */
import { L_TETROMINO, rotate } from "@cogniarena/grid-recall";
import { ShapeView } from "@cogniarena/grid-recall/components";

const BALLS = [
  { row: 0, col: 1, n: 1 },
  { row: 1, col: 3, n: 2 },
  { row: 2, col: 2, n: 3 },
];

export function HeroPreview() {
  const cells = Array.from({ length: 16 }, (_, i) => ({ row: Math.floor(i / 4), col: i % 4 }));
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/70 via-violet-200/40 to-transparent blur-2xl dark:from-indigo-900/50 dark:via-violet-900/30" />

      {/* Game card */}
      <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">Level 3</span>
          <span className="flex gap-1.5">
            {BALLS.map((b) => (
              <span key={b.n} className="size-2.5 rounded-full bg-indigo-500" />
            ))}
          </span>
          <span className="font-mono text-lg tabular-nums">5:42</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {cells.map((c) => {
            const ball = BALLS.find((b) => b.row === c.row && b.col === c.col);
            return (
              <div key={`${c.row}-${c.col}`} className="relative aspect-square rounded-xl bg-zinc-100 dark:bg-zinc-800">
                {ball && (
                  <span
                    className="absolute inset-[18%] flex items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/40 motion-safe:animate-seq-blink"
                    style={{ animationDelay: `${(ball.n - 1) * 1.2}s` }}
                  >
                    <span className="motion-safe:hidden">{ball.n}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shape question card, overlapping the corner */}
      <div className="absolute -bottom-10 -left-6 w-56 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-zinc-200 sm:-left-12 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Same shape, only rotated?</p>
        <div className="flex items-center gap-3 [&_figcaption]:hidden">
          <ShapeView shape={L_TETROMINO} span={3} label="Original" tutorialId="hero-left" />
          <ShapeView shape={rotate(L_TETROMINO, 1)} span={3} label="Rotated" tutorialId="hero-right" />
        </div>
        <div className="mt-3 flex gap-2 text-sm font-semibold">
          <span className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-center text-white">Yes</span>
          <span className="flex-1 rounded-lg bg-zinc-200 py-1.5 text-center dark:bg-zinc-800">No</span>
        </div>
      </div>
    </div>
  );
}
