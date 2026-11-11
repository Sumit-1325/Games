"use client";

import { useEffect, useRef, useState } from "react";
import type { Cell } from "@cogniarena/game-core";
import { getBlockCells, sameCell } from "../engine/solver";
import type { Block, FixedBlock } from "../engine/types";

export interface BoardViewProps {
  gridSize: number;
  redBall: Cell;
  target: Cell;
  blocks: Block[];
  fixedBlocks: FixedBlock[];
  onMoveBallTo?: (cell: Cell) => void;
  onMoveBall?: (direction: "up" | "down" | "left" | "right") => void;
  onMoveBlock?: (id: string, direction: "up" | "down" | "left" | "right") => void;
  disabled?: boolean;
}

export function BoardView({
  gridSize,
  redBall,
  target,
  blocks,
  fixedBlocks,
  onMoveBallTo,
  onMoveBall,
  onMoveBlock,
  disabled = false,
}: BoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPiece, setSelectedPiece] = useState<"ball" | string>("ball");
  const [dragInfo, setDragInfo] = useState<{
    id: string | "ball";
    startX: number;
    startY: number;
    triggered: boolean;
  } | null>(null);

  // Keyboard navigation: controls either the red ball or currently selected obstacle
  useEffect(() => {
    if (disabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      let dir: "up" | "down" | "left" | "right" | null = null;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") dir = "up";
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") dir = "down";
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") dir = "left";
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") dir = "right";

      if (dir) {
        e.preventDefault();
        if (selectedPiece === "ball") {
          onMoveBall?.(dir);
        } else {
          onMoveBlock?.(selectedPiece, dir);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, selectedPiece, onMoveBall, onMoveBlock]);

  // Pointer drag/swipe gesture: slides piece all the way in the dragged direction
  const handlePointerDown = (id: string | "ball", e: React.PointerEvent) => {
    if (disabled) return;
    setSelectedPiece(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragInfo({
      id,
      startX: e.clientX,
      startY: e.clientY,
      triggered: false,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo || dragInfo.triggered || disabled) return;
    const dx = e.clientX - dragInfo.startX;
    const dy = e.clientY - dragInfo.startY;
    const threshold = 14;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      const dir: "left" | "right" | "up" | "down" =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
          ? "down"
          : "up";

      setDragInfo((prev) => (prev ? { ...prev, triggered: true } : null));

      if (dragInfo.id === "ball") {
        onMoveBall?.(dir);
      } else {
        onMoveBlock?.(dragInfo.id, dir);
      }
    }
  };

  const handlePointerUp = () => {
    setDragInfo(null);
  };

  // Precompute set of obstacle cells
  const blockCells = new Set<string>();
  blocks.flatMap(getBlockCells).forEach((c) => blockCells.add(`${c.row},${c.col}`));
  const fixedSet = new Set(fixedBlocks.map((f) => `${f.row},${f.col}`));

  // Check line of sight from the red ball
  const isReachableLineOfSight = (r: number, c: number): boolean => {
    if (r === redBall.row && c === redBall.col) return false;
    if (r !== redBall.row && c !== redBall.col) return false;

    const stepR = r === redBall.row ? 0 : r > redBall.row ? 1 : -1;
    const stepC = c === redBall.col ? 0 : c > redBall.col ? 1 : -1;

    let checkR = redBall.row + stepR;
    let checkC = redBall.col + stepC;
    while (checkR !== r || checkC !== c) {
      const key = `${checkR},${checkC}`;
      if (fixedSet.has(key) || blockCells.has(key)) return false;
      checkR += stepR;
      checkC += stepC;
    }

    const endKey = `${r},${c}`;
    return !fixedSet.has(endKey) && !blockCells.has(endKey);
  };

  const gapClass = gridSize >= 7 ? "gap-1" : "gap-1.5 sm:gap-2";
  const paddingClass = gridSize >= 7 ? "p-1.5 sm:p-2" : "p-2 sm:p-3";

  return (
    <div
      ref={containerRef}
      data-tutorial="grid"
      className={`relative w-full max-w-[440px] aspect-square mx-auto ${paddingClass} rounded-2xl bg-slate-900/90 dark:bg-zinc-950 border border-slate-700/60 shadow-2xl select-none touch-none`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDragInfo(null)}
    >
      {/* Background Grid Cells */}
      <div
        className={`w-full h-full grid ${gapClass} rounded-xl p-1 bg-slate-950/60`}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: gridSize }).map((_, r) =>
          Array.from({ length: gridSize }).map((_, c) => {
            const isTarget = sameCell({ row: r, col: c }, target);
            const isFixed = fixedSet.has(`${r},${c}`);
            const canTap = !disabled && isReachableLineOfSight(r, c);

            return (
              <div
                key={`cell-${r}-${c}`}
                onClick={() => {
                  setSelectedPiece("ball");
                  if (canTap && onMoveBallTo) {
                    onMoveBallTo({ row: r, col: c });
                  }
                }}
                className={`relative rounded-lg transition-all flex items-center justify-center ${
                  isFixed
                    ? "bg-zinc-800 border border-zinc-700/70 shadow-inner"
                    : isTarget
                    ? "bg-zinc-900 border-2 border-dashed border-red-500/50"
                    : canTap
                    ? "bg-slate-800/80 border border-indigo-500/30 cursor-pointer hover:bg-indigo-900/40"
                    : "bg-slate-800/40 border border-slate-700/30"
                }`}
              >
                {/* Target Destination Hole */}
                {isTarget && (
                  <div
                    data-tutorial="target-hole"
                    className="relative w-3/4 h-3/4 rounded-full bg-black border-2 border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.35)] flex items-center justify-center animate-pulse"
                  >
                    <div className="w-1/3 h-1/3 rounded-full bg-red-500/60" />
                  </div>
                )}

                {/* Fixed Wall Texture */}
                {isFixed && (
                  <div
                    data-tutorial="fixed-wall"
                    className="w-full h-full flex items-center justify-center text-zinc-600 font-bold opacity-30 select-none text-xs"
                  >
                    ✕
                  </div>
                )}

                {/* Path Dot Indicator */}
                {canTap && !isTarget && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40 pointer-events-none" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Elements Layer: Obstacle Blocks & Red Ball */}
      <div className="absolute inset-0 p-3 sm:p-4 pointer-events-none">
        <div className="relative w-full h-full">
          {/* Obstacle Blocks (Slide seamlessly on drag/swipe without arrow clutter) */}
          {blocks.map((b) => {
            const widthPct = b.orientation === "h" ? (b.length / gridSize) * 100 : (1 / gridSize) * 100;
            const heightPct = b.orientation === "v" ? (b.length / gridSize) * 100 : (1 / gridSize) * 100;
            const leftPct = (b.col / gridSize) * 100;
            const topPct = (b.row / gridSize) * 100;

            const insetOffset = gridSize >= 7 ? "4px" : "6px";
            const posOffset = gridSize >= 7 ? "2px" : "3px";
            const isSelected = selectedPiece === b.id;

            return (
              <div
                key={b.id}
                data-tutorial="block-item"
                onPointerDown={(e) => handlePointerDown(b.id, e)}
                style={{
                  width: `calc(${widthPct}% - ${insetOffset})`,
                  height: `calc(${heightPct}% - ${insetOffset})`,
                  left: `calc(${leftPct}% + ${posOffset})`,
                  top: `calc(${topPct}% + ${posOffset})`,
                  backgroundColor: b.color,
                }}
                className={`absolute rounded-xl shadow-lg border pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-200 flex items-center justify-center select-none ${
                  isSelected ? "border-white ring-2 ring-white/60 shadow-xl" : "border-white/30"
                }`}
              >
                {/* Clean grip indicators (no arrows) */}
                {b.orientation === "v" ? (
                  <div className="flex flex-col gap-1.5 items-center opacity-70 pointer-events-none">
                    <div className="w-3 h-1 rounded-full bg-white/70 shadow-sm" />
                    <div className="w-3 h-1 rounded-full bg-white/70 shadow-sm" />
                    <div className="w-3 h-1 rounded-full bg-white/70 shadow-sm" />
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center opacity-70 pointer-events-none">
                    <div className="w-1 h-3 rounded-full bg-white/70 shadow-sm" />
                    <div className="w-1 h-3 rounded-full bg-white/70 shadow-sm" />
                    <div className="w-1 h-3 rounded-full bg-white/70 shadow-sm" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Red Ball */}
          <div
            data-tutorial="red-ball"
            onPointerDown={(e) => handlePointerDown("ball", e)}
            style={{
              width: `calc(${(1 / gridSize) * 100}% - ${gridSize >= 7 ? "6px" : "10px"})`,
              height: `calc(${(1 / gridSize) * 100}% - ${gridSize >= 7 ? "6px" : "10px"})`,
              left: `calc(${((redBall.col + 0.5) / gridSize) * 100}% - calc(${
                (1 / gridSize) * 50
              }% - ${gridSize >= 7 ? "3px" : "5px"}))`,
              top: `calc(${((redBall.row + 0.5) / gridSize) * 100}% - calc(${
                (1 / gridSize) * 50
              }% - ${gridSize >= 7 ? "3px" : "5px"}))`,
            }}
            className="absolute rounded-full pointer-events-auto cursor-grab active:cursor-grabbing transition-all duration-200 shadow-[0_4px_16px_rgba(239,68,68,0.65)] bg-gradient-to-tr from-rose-700 via-red-500 to-rose-300 border-2 border-white/70 flex items-center justify-center"
          >
            <div className="w-1/3 h-1/3 rounded-full bg-white/60 -mt-1 -ml-1 blur-[0.5px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
