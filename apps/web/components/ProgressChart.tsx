"use client";

/**
 * Assessment score per session, oldest → newest. One series, so no legend: the
 * heading names it. 2px line, 8px end-dot with a surface ring, hairline grid,
 * crosshair + tooltip that snaps to the nearest session (pointer or ←/→ keys).
 * Colours checked with the dataviz validator: indigo-600 light, indigo-500 dark.
 * The History table on the same page is the table view of this data.
 */
import { useState } from "react";

export interface TrendPoint {
  date: string;
  score: number;
  level: number;
  recallAccuracy: number | null;
}

const W = 640;
const H = 220;
const M = { top: 16, right: 16, bottom: 28, left: 40 };

function niceMax(v: number) {
  if (v <= 10) return 10;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

export function ProgressChart({ points }: { points: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2) {
    return <p className="text-sm text-zinc-500">Play at least two Assessment sessions to see your progress chart.</p>;
  }

  const yMax = niceMax(Math.max(...points.map((p) => p.score)));
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => M.top + ih - (v / yMax) * ih;
  const ticks = [0, yMax / 2, yMax];
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.score)}`).join("");
  const area = `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const lastI = points.length - 1;
  const shown = active ?? null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - M.left) / iw) * lastI);
    setActive(Math.max(0, Math.min(lastI, i)));
  };

  const p = shown === null ? null : points[shown]!;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none text-indigo-600 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-500"
        role="img"
        aria-label={`Assessment score over ${points.length} sessions, latest ${points[lastI]!.score}`}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(lastI)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? lastI) - 1));
          if (e.key === "ArrowRight") setActive((a) => Math.min(lastI, (a ?? lastI) + 1));
        }}
      >
        {/* Recessive hairline grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-zinc-500 text-[11px] tabular-nums">
              {t}
            </text>
          </g>
        ))}
        <text x={M.left} y={H - 8} className="fill-zinc-500 text-[11px]">
          {fmtDate(points[0]!.date)}
        </text>
        <text x={W - M.right} y={H - 8} textAnchor="end" className="fill-zinc-500 text-[11px]">
          {fmtDate(points[lastI]!.date)}
        </text>

        <path d={area} className="fill-current" opacity={0.1} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Crosshair at the snapped session */}
        {p && shown !== null && (
          <line x1={x(shown)} x2={x(shown)} y1={M.top} y2={M.top + ih} className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth={1} />
        )}
        {/* End dot (latest), or the hovered point; 2px surface ring keeps it legible on the line */}
        {[shown ?? lastI].map((i) => (
          <circle key={i} cx={x(i)} cy={y(points[i]!.score)} r={4} fill="currentColor" strokeWidth={2} className="stroke-white dark:stroke-zinc-900" />
        ))}
        {/* Direct label on the latest value only */}
        {shown === null && (
          <text x={x(lastI) - 8} y={y(points[lastI]!.score) - 10} textAnchor="end" className="fill-zinc-700 text-[12px] font-semibold tabular-nums dark:fill-zinc-200">
            {points[lastI]!.score}
          </text>
        )}
      </svg>

      {p && shown !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 rounded-lg bg-white px-3 py-2 text-xs shadow-md ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700"
          style={{ left: `${(x(shown) / W) * 100}%`, transform: `translateX(${shown > lastI / 2 ? "-105%" : "5%"})` }}
        >
          <p className="font-medium text-zinc-500">{new Date(p.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          <p className="text-zinc-900 dark:text-zinc-100">
            Score <strong className="tabular-nums">{p.score}</strong> · level {p.level}
          </p>
          {p.recallAccuracy !== null && <p className="text-zinc-600 dark:text-zinc-400">Recall {Math.round(p.recallAccuracy * 100)}%</p>}
        </div>
      )}
    </figure>
  );
}
