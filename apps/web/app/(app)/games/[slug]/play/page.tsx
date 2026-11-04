/**
 * Play page. Reads the lobby's choices from the URL, validates them with the
 * game's own config schema, and issues the session seed on the server, which
 * is where the session API will issue it once accounts exist.
 */
import { notFound } from "next/navigation";
import { randomSeed } from "@cogniarena/game-core";
import { gridRecallConfigSchema, type GridRecallConfig } from "@cogniarena/grid-recall";
import { PlayClient } from "@/components/PlayClient";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PlayPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  // Only Grid Recall has a Play screen so far.
  if (slug !== "grid-recall") notFound();

  const q = await searchParams;
  const mode = one(q.mode) === "practice" ? "practice" : "assessment";

  let config: GridRecallConfig = {};
  let durationMs: number | null;
  if (mode === "practice") {
    const parsed = gridRecallConfigSchema.safeParse({ rows: Number(one(q.rows)), cols: Number(one(q.cols)) });
    config = parsed.success ? parsed.data : { rows: 5, cols: 5 };
    durationMs = null;
  } else {
    durationMs = (one(q.minutes) === "9" ? 9 : 6) * 60_000;
  }

  return (
    <div className="flex flex-1 items-start justify-center pt-2">
      <PlayClient seed={randomSeed()} mode={mode} config={config} durationMs={durationMs} />
    </div>
  );
}
