/**
 * Game lobby. Like the real test there is one main action, Start assessment:
 * the play screen opens with a short automatic demo, then Start begins the timer.
 * Practice (untimed, any grid size) is the second option. Both are plain GET
 * forms to ./play, so they work without client JavaScript.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { LobbyOptions } from "@/components/LobbyOptions";
import { getGame } from "@/lib/registry";
import { getCurrentUser } from "@/lib/server/current-user";
import { getProgress } from "@/lib/server/sessions";


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

      <LobbyOptions
        slug={slug}
        demoBlurb={game.demoBlurb}
        practiceGridSize={game.practiceGridSize}
      />

      <div className="flex justify-between text-sm">
        <Link href="/dashboard" className="text-zinc-500 hover:underline">
          ← Dashboard
        </Link>
        {game.hasWalkthrough && (
          <Link href={`/games/${slug}/tutorial`} className="text-indigo-600 hover:underline dark:text-indigo-400">
            Full walkthrough: how to play
          </Link>
        )}
      </div>
    </div>
  );
}
