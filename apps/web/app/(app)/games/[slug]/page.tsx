/**
 * Game lobby: description, skills, mode picker and grid size. A plain GET form
 * to ./play, so it works without client JavaScript. Assessment stays locked
 * until the tutorial practice round is passed; Practice is always open.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { getGame } from "@/lib/registry";
import { getCurrentUser } from "@/lib/server/current-user";
import { getProgress } from "@/lib/server/sessions";

const sizes = [3, 4, 5, 6, 7, 8];
const field = "rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800";

export default async function LobbyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();
  const { engine, description } = game;
  const user = await getCurrentUser();
  const progress = user ? await getProgress(getDb(), user.id, slug) : null;
  const unlocked = !!progress?.tutorialCompleted;

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

      {!unlocked && (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-900">
          <p className="font-semibold">New here? Start with the 60-second tutorial.</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Pass its practice round once to unlock Assessment mode.</p>
          <Link href={`/games/${slug}/tutorial`} className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500">
            Start tutorial
          </Link>
        </div>
      )}

      <form action={`/games/${slug}/play`} className="flex flex-col gap-6 rounded-2xl bg-white p-6 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold">Mode</legend>
          <label className={`flex items-start gap-3 ${unlocked ? "" : "opacity-50"}`}>
            <input type="radio" name="mode" value="assessment" defaultChecked={unlocked} disabled={!unlocked} className="mt-1 accent-indigo-600" />
            <span>
              <span className="font-medium">Assessment {!unlocked && "🔒"}</span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                {unlocked ? "Timed, levels get harder as you pass them. Counts for your stats." : "Finish the tutorial to unlock."}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="mode" value="practice" defaultChecked={!unlocked} className="mt-1 accent-indigo-600" />
            <span>
              <span className="font-medium">Practice</span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">No timer, and you pick the grid size. Saved to history, not ranked.</span>
            </span>
          </label>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Session (assessment)
            <select name="minutes" defaultValue="6" className={field}>
              <option value="6">6 min</option>
              <option value="9">9 min</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Rows (practice)
            <select name="rows" defaultValue="5" className={field}>
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Columns (practice)
            <select name="cols" defaultValue="5" className={field}>
              {sizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="-mt-3 text-xs text-zinc-500">On phones, grids above 6×6 get small: 6×6 or less plays best.</p>

        <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500">
          Start
        </button>
      </form>

      <div className="flex justify-between text-sm">
        <Link href="/dashboard" className="text-zinc-500 hover:underline">
          ← Dashboard
        </Link>
        <Link href={`/games/${slug}/tutorial`} className="text-indigo-600 hover:underline dark:text-indigo-400">
          How to play
        </Link>
      </div>
    </div>
  );
}
