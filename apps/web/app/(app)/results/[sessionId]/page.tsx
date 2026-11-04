/**
 * Results (PLAN.md → "Screens"): score, level reached, recall and shape
 * accuracy, reaction time and a level-by-level breakdown, all from the
 * server-scored attempts, not from the browser.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { summarise, type GridRecallResult } from "@cogniarena/grid-recall";
import { getCurrentUser } from "@/lib/server/current-user";
import { ApiError, getSessionResults } from "@/lib/server/sessions";

export const metadata = { title: "Results · CogniArena" };

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)}%`);

export default async function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/results/${sessionId}`);

  let data;
  try {
    data = await getSessionResults(getDb(), user.id, sessionId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { session, slug, attempts } = data;
  const results = attempts.map((a) => a.result as unknown as GridRecallResult);
  const s = summarise(results);
  const mins = session.endedAt ? Math.max(1, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000)) : null;

  const tiles: [string, string][] = [
    ["Score", String(session.totalScore)],
    ["Level reached", String(session.finalLevel || s.highestLevel || "–")],
    ["Recall accuracy", pct(s.recallAccuracy)],
    ["Shape accuracy", pct(s.distractorAccuracy)],
    ["Avg reaction", s.avgReactionMs === null ? "–" : `${s.avgReactionMs} ms`],
    ["Levels played", String(s.levelsPlayed)],
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-8">
      <header>
        <p className="text-sm text-zinc-500">
          Grid Recall · {session.mode === "assessment" ? "Assessment" : "Practice"} · {session.startedAt.toLocaleString("en-IN")}
          {mins && ` · ${mins} min`}
        </p>
        <h1 className="text-3xl font-bold">Results</h1>
        {session.status !== "finished" && <p className="mt-2 text-amber-600">This session wasn&apos;t finished.</p>}
        {session.flagged && (
          <p className="mt-2 text-sm text-amber-600">Some answers were faster than humanly possible, so this session doesn&apos;t count toward your bests.</p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <dt className="text-xs text-zinc-500">{k}</dt>
            <dd className="text-2xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 font-semibold">Level by level</h2>
        {results.length === 0 ? (
          <p className="text-sm text-zinc-500">No levels were completed.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-zinc-200 dark:ring-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Recall</th>
                  <th className="px-3 py-2">Shapes</th>
                  <th className="px-3 py-2">Avg reaction</th>
                  <th className="px-3 py-2 text-right">Points</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2">{r.level}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.recallCorrect}/{r.balls}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.distractorCorrect}/{r.distractorTotal}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.avgReactionMs === null ? "–" : `${r.avgReactionMs} ms`}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.points}</td>
                    <td className={`px-3 py-2 font-medium ${r.passed ? "text-emerald-600" : "text-red-500"}`}>{r.passed ? "Pass" : "Fail"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`/games/${slug}/play?mode=${session.mode}`} className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500">
          Play again
        </Link>
        <Link href="/profile" className="rounded-xl bg-zinc-200 px-6 py-3 font-medium hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          History
        </Link>
      </div>
    </div>
  );
}
