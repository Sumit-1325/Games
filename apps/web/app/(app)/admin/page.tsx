import { notFound } from "next/navigation";
import { getDb } from "@cogniarena/db";
import { AdminGameToggle } from "@/components/AdminGameToggle";
import { getCurrentUser } from "@/lib/server/current-user";
import { adminOverview } from "@/lib/server/sessions";

export const metadata = { title: "Admin · CogniArena" };

/** Admin (PLAN.md → "Roles"): switch games on and off, see usage. */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") notFound();
  const rows = await adminOverview(getDb());
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <h1 className="text-3xl font-bold">Admin</h1>
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-500">
          <tr>
            <th className="py-2">Game</th>
            <th className="text-right">Sessions</th>
            <th className="text-right">Players</th>
            <th className="text-right">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.slug} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-2">{g.name}</td>
              <td className="text-right tabular-nums">{g.sessions}</td>
              <td className="text-right tabular-nums">{g.players}</td>
              <td className="text-right">
                <AdminGameToggle slug={g.slug} isActive={g.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
