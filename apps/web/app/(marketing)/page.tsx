import Link from "next/link";
import { games } from "@/lib/registry";

const comingSoon = ["Digit Challenge", "Switch Challenge"];

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center gap-12 py-12 text-center sm:py-20">
      <section className="flex max-w-2xl flex-col items-center gap-5">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Train for game-based hiring tests</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Practise memory and reasoning games inspired by the game-based assessments used by companies like Capgemini.
        </p>
        <Link href="/games/grid-recall" className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500">
          Start practising
        </Link>
      </section>

      <section className="grid w-full gap-4 sm:grid-cols-3">
        {Object.values(games).map(({ engine, description }) => (
          <Link
            key={engine.slug}
            href={`/games/${engine.slug}`}
            className="rounded-2xl bg-white p-5 text-left ring-1 ring-zinc-200 hover:ring-indigo-400 dark:bg-zinc-900 dark:ring-zinc-800"
          >
            <h2 className="font-semibold">{engine.title}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          </Link>
        ))}
        {comingSoon.map((title) => (
          <div key={title} className="rounded-2xl border border-dashed border-zinc-300 p-5 text-left dark:border-zinc-700">
            <h2 className="font-semibold text-zinc-500">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">Coming soon</p>
          </div>
        ))}
      </section>
    </div>
  );
}
