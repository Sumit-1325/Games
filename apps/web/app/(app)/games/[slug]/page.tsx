/**
 * Game lobby. Like the real test there is one main action, Start assessment:
 * the play screen opens with a short automatic demo, then Start begins the timer.
 * Practice (untimed, any grid size) is the second option. Both are plain GET
 * forms to ./play, so they work without client JavaScript.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { getGame } from "@/lib/registry";
import { getCurrentUser } from "@/lib/server/current-user";
import { getProgress } from "@/lib/server/sessions";

const sizes = [3, 4, 5, 6, 7, 8];
const field = "rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800";
const card = "flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800";

export default async function LobbyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();
  const { engine, description } = game;
  const user = await getCurrentUser();
  const progress = user ? await getProgress(getDb(), user.id, slug) : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{engine.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
        <ul className="flex flex-wrap gap-2 pt-1">
          {engine.skills.map((s) => (
            <li key={s} className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
              {s}
            </li>
          ))}
        </ul>
        {progress && progress.sessionsPlayed > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Best score {progress.bestScore} · best level {progress.bestLevel} · {progress.sessionsPlayed} sessions played
          </p>
        )}
      </header>

      <form action={`/games/${slug}/play`} className={card}>
        <input type="hidden" name="mode" value="assessment" />
        <div>
          <h2 className="text-lg font-semibold">Assessment</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Starts with a quick demo: a ball blinks and you answer one shape question. Then press Start and the timer begins. Levels get harder as you pass them.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Session length
          <select name="minutes" defaultValue="6" className={field}>
            <option value="6">6 min</option>
            <option value="9">9 min</option>
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white hover:bg-indigo-500">
          Start assessment
        </button>
      </form>

      <form action={`/games/${slug}/play`} className={card}>
        <input type="hidden" name="mode" value="practice" />
        <div>
          <h2 className="font-semibold">Practice</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No timer, and you pick the grid size. Saved to history, not ranked.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Rows
            <select name="rows" defaultValue="5" className={field}>
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Columns
            <select name="cols" defaultValue="5" className={field}>
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="-mt-2 text-xs text-zinc-500">On phones, grids above 6×6 get small: 6×6 or less plays best.</p>
        <button type="submit" className="rounded-xl bg-zinc-200 px-6 py-3 font-semibold hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          Start practice
        </button>
      </form>

      <div className="flex justify-between text-sm">
        <Link href="/dashboard" className="text-zinc-500 hover:underline">
          ← Dashboard
        </Link>
        <Link href={`/games/${slug}/tutorial`} className="text-indigo-600 hover:underline dark:text-indigo-400">
          Full walkthrough: how to play
        </Link>
      </div>
    </div>
  );
}
