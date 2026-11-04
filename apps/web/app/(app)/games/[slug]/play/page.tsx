/**
 * Play page. Reads the lobby's choices from the URL; the client then asks the
 * session API for a seed, and the server validates the config again.
 */
import { notFound } from "next/navigation";
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
  const minutes = one(q.minutes) === "9" ? 9 : 6;
  let config: GridRecallConfig = {};
  if (mode === "practice") {
    const parsed = gridRecallConfigSchema.safeParse({ rows: Number(one(q.rows)), cols: Number(one(q.cols)) });
    config = parsed.success ? parsed.data : { rows: 5, cols: 5 };
  }

  return (
    <div className="flex flex-1 items-start justify-center pt-2">
      <PlayClient mode={mode} config={config} minutes={minutes} />
    </div>
  );
}
