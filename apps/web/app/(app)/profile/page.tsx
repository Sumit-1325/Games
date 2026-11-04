/**
 * History / Profile (PLAN.md → "Screens"): progress chart per game, sessions
 * table, profile fields, settings, and account controls.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { AccountActions, ProfileForm, SettingsPanel } from "@/components/ProfileControls";
import { ProgressChart } from "@/components/ProgressChart";
import { getCurrentUser } from "@/lib/server/current-user";
import { getStats, listSessions } from "@/lib/server/sessions";

export const metadata = { title: "Profile · CogniArena" };
const PAGE = 20;

const card = "rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/profile");
  const offset = Math.max(0, Number((await searchParams).offset) || 0);
  const db = getDb();
  const [stats, history] = await Promise.all([getStats(db, user.id, "grid-recall"), listSessions(db, user.id, { limit: PAGE, offset })]);
  const trend = stats.trend.filter((t) => t.mode === "assessment");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{user.isAnonymous ? "Guest" : user.name}</h1>
          <p className="text-sm text-zinc-500">{user.isAnonymous ? "Playing as a guest on this device" : user.email}</p>
        </div>
        {user.isAnonymous && (
          <Link href="/sign-in?next=/profile" className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500">
            Sign in to keep your history
          </Link>
        )}
      </header>

      <section className={card}>
        <h2 className="mb-1 font-semibold">Grid Recall · Assessment score</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Best {stats.bestScore} · best level {stats.bestLevel || "–"} · {stats.sessionsPlayed} sessions · {stats.streak}-day streak
        </p>
        <ProgressChart points={trend} />
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">History</h2>
        {history.sessions.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No sessions yet.{" "}
            <Link href="/games/grid-recall" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Play Grid Recall
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Game</th>
                  <th>Mode</th>
                  <th className="text-right">Level</th>
                  <th className="text-right">Score</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-2">{s.startedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td>{s.name}</td>
                    <td className="capitalize">{s.mode}</td>
                    <td className="text-right tabular-nums">{s.finalLevel ?? "–"}</td>
                    <td className="text-right tabular-nums">
                      {s.totalScore}
                      {s.flagged && <span title="Flagged: not counted toward bests"> ⚠</span>}
                    </td>
                    <td className="text-right">
                      <Link href={`/results/${s.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-between text-sm">
              {offset > 0 ? <Link href={`/profile?offset=${Math.max(0, offset - PAGE)}`} className="hover:underline">← Newer</Link> : <span />}
              {history.hasMore && <Link href={`/profile?offset=${offset + PAGE}`} className="hover:underline">Older →</Link>}
            </div>
          </div>
        )}
      </section>

      {!user.isAnonymous && (
        <section className={card}>
          <h2 className="mb-3 font-semibold">Profile</h2>
          <ProfileForm
            name={user.name}
            college={user.college ?? null}
            graduationYear={user.graduationYear ?? null}
            targetCompanies={user.targetCompanies ?? null}
          />
        </section>
      )}

      <section className={card}>
        <h2 className="mb-1 font-semibold">Settings</h2>
        <SettingsPanel />
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Account</h2>
        <AccountActions isAnonymous={!!user.isAnonymous} />
      </section>
    </div>
  );
}
