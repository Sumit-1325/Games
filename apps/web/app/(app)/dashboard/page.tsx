/**
 * Dashboard (PLAN.md → "Screens"): game cards grouped by company tag, with the
 * player's last score, streak and best level. Games still to come show as
 * "Coming soon".
 */
import Link from "next/link";
import { getDb } from "@cogniarena/db";
import { games } from "@/lib/registry";
import { getCurrentUser } from "@/lib/server/current-user";
import { adminOverview, getStats } from "@/lib/server/sessions";

export const metadata = { title: "Dashboard · CogniArena" };

const COMING_SOON = [
  { title: "Digit Challenge", tag: "capgemini", blurb: "Fill in digits so the equation balances." },
  { title: "Switch Challenge", tag: "capgemini", blurb: "Work out which code reordered the shapes." },
  { title: "Deductive (Geo-Sudo)", tag: "capgemini", blurb: "Find the missing symbol in the grid." },
];

const COMPANY_NAMES: Record<string, string> = { capgemini: "Capgemini-style" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const active = new Map((await adminOverview(db)).map((g) => [g.slug, g.isActive]));
  const playable = await Promise.all(
    Object.values(games)
      .filter(({ engine }) => active.get(engine.slug) !== false)
      .map(async (g) => ({ ...g, stats: user ? await getStats(db, user.id, g.engine.slug) : null })),
  );
  const tags = [...new Set([...playable.flatMap((g) => g.engine.companyTags), ...COMING_SOON.map((c) => c.tag)])];

  return (
    <div className="flex flex-col gap-10 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{user && !user.isAnonymous ? `Hi, ${user.name.split(" ")[0]}` : "Your games"}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Pick a game to practise.</p>
        </div>
        {(!user || user.isAnonymous) && (
          <Link href="/sign-in" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            Sign in to keep your history →
          </Link>
        )}
      </header>

      {tags.map((tag) => (
        <section key={tag} className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">{COMPANY_NAMES[tag] ?? tag}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playable
              .filter((g) => g.engine.companyTags.includes(tag))
              .map(({ engine, description, stats }) => (
                <Link
                  key={engine.slug}
                  href={`/games/${engine.slug}`}
                  className="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200 hover:ring-indigo-400 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <div>
                    <h3 className="font-semibold">{engine.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Last score", stats?.lastScore ?? "–"],
                      ["Streak", stats ? `${stats.streak}d` : "–"],
                      ["Best level", stats?.bestLevel || "–"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-zinc-100 py-2 dark:bg-zinc-800">
                        <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                        <dt className="text-xs text-zinc-500">{k}</dt>
                      </div>
                    ))}
                  </dl>
                  {!stats?.tutorialCompleted && <p className="text-xs text-indigo-600 dark:text-indigo-400">Start with the tutorial →</p>}
                </Link>
              ))}
            {COMING_SOON.filter((c) => c.tag === tag).map((c) => (
              <div key={c.title} className="flex flex-col gap-1 rounded-2xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
                <h3 className="font-semibold text-zinc-500">{c.title}</h3>
                <p className="text-sm text-zinc-500">{c.blurb}</p>
                <p className="mt-auto pt-2 text-xs font-medium text-zinc-400">Coming soon</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
