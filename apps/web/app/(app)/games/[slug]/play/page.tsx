/**
 * Play page for any registered game. Reads the lobby's choices from the URL;
 * the client then asks the session API for a seed, and the server validates
 * the config again.
 */
import { notFound } from "next/navigation";
import { PlayClient } from "@/components/PlayClient";
import { getGame } from "@/lib/registry";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PlayPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const q = await searchParams;
  const mode = one(q.mode) === "practice" ? "practice" : "assessment";
  const minutes = one(q.minutes) === "9" ? 9 : 6;
  let config: Record<string, unknown> = {};
  if (mode === "practice" && game.practiceGridSize) {
    const parsed = game.engine.configSchema.safeParse({ rows: Number(one(q.rows)), cols: Number(one(q.cols)) });
    config = parsed.success ? (parsed.data as Record<string, unknown>) : { rows: 5, cols: 5 };
  }

  return (
    <div className="flex flex-1 items-start justify-center pt-2">
      <PlayClient slug={slug} mode={mode} config={config} minutes={minutes} />
    </div>
  );
}
