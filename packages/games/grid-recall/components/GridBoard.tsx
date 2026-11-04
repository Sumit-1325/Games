"use client";

/**
 * The grid. One component covers every phase:
 * - blink:    `lit` shows the ball in one cell;
 * - recall:   `onTap` turns cells into active buttons and `taps` shows order badges;
 * - feedback: `feedback` colours taps right (green) / wrong (red) and outlines missed cells.
 * Cells are real buttons with "row r, column c" labels; arrow keys move focus.
 */
import type { KeyboardEvent } from "react";
import type { Cell } from "@cogniarena/game-core";

export interface GridBoardProps {
  rows: number;
  cols: number;
  lit?: Cell | null;
  taps?: Cell[];
  onTap?: (cell: Cell) => void;
  feedback?: { sequence: Cell[]; taps: Cell[] };
}

const same = (a: Cell | undefined, b: Cell) => a !== undefined && a.row === b.row && a.col === b.col;
const indexOf = (cells: Cell[] | undefined, c: Cell) => cells?.findIndex((x) => same(x, c)) ?? -1;

type CellLook = { tone: "plain" | "ball" | "tapped" | "right" | "wrong" | "missed"; badge?: number };

function lookFor(cell: Cell, p: GridBoardProps): CellLook {
  if (p.feedback) {
    const tapAt = indexOf(p.feedback.taps, cell);
    if (tapAt >= 0) return { tone: same(p.feedback.sequence[tapAt], cell) ? "right" : "wrong", badge: tapAt + 1 };
    const trueAt = indexOf(p.feedback.sequence, cell);
    if (trueAt >= 0) return { tone: "missed", badge: trueAt + 1 };
    return { tone: "plain" };
  }
  if (p.lit && same(p.lit, cell)) return { tone: "ball" };
  const tapAt = indexOf(p.taps, cell);
  if (tapAt >= 0) return { tone: "tapped", badge: tapAt + 1 };
  return { tone: "plain" };
}

const TONE_CLASS: Record<CellLook["tone"], string> = {
  plain: "bg-zinc-100 dark:bg-zinc-800",
  ball: "bg-zinc-100 dark:bg-zinc-800",
  tapped: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  right: "bg-emerald-500 text-white motion-safe:animate-pulse-once",
  wrong: "bg-red-500 text-white motion-safe:animate-shake",
  missed: "bg-transparent text-zinc-500 outline-2 -outline-offset-4 outline-dashed outline-zinc-400 dark:text-zinc-400",
};

function moveFocus(e: KeyboardEvent<HTMLDivElement>, rows: number, cols: number) {
  const delta = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  const target = e.target as HTMLElement;
  if (!delta || target.dataset.row === undefined) return;
  e.preventDefault();
  e.stopPropagation(); // arrow keys here move focus, not answer a question
  const row = Math.min(rows - 1, Math.max(0, Number(target.dataset.row) + delta[0]!));
  const col = Math.min(cols - 1, Math.max(0, Number(target.dataset.col) + delta[1]!));
  e.currentTarget.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)?.focus();
}

export function GridBoard(props: GridBoardProps) {
  const { rows, cols, onTap } = props;
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) cells.push({ row, col });

  return (
    <div
      data-tutorial="grid"
      role="grid"
      aria-label={`${rows} by ${cols} grid`}
      className="grid h-full w-full gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      onKeyDown={(e) => moveFocus(e, rows, cols)}
    >
      {cells.map((cell) => {
        const look = lookFor(cell, props);
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            type="button"
            data-row={cell.row}
            data-col={cell.col}
            aria-label={`row ${cell.row + 1}, column ${cell.col + 1}${look.badge ? `, number ${look.badge}` : ""}`}
            disabled={!onTap}
            onClick={() => onTap?.(cell)}
            className={`relative flex items-center justify-center rounded-lg text-lg font-semibold transition-colors sm:text-2xl ${TONE_CLASS[look.tone]} ${
              onTap ? "cursor-pointer hover:bg-indigo-50 dark:hover:bg-zinc-700" : "cursor-default"
            } focus-visible:outline-2 focus-visible:outline-indigo-500`}
          >
            {look.tone === "ball" && (
              // Ring + glow, not colour alone, so the ball stands out for colour-blind players.
              <span className="block size-3/5 rounded-full bg-indigo-500 shadow-[0_0_24px_6px] shadow-indigo-500/60 ring-4 ring-white/70 motion-safe:animate-ball-in dark:ring-zinc-900/70" />
            )}
            {look.badge !== undefined && <span>{look.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
