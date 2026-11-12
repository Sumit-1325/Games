"use client";

import { useEffect, useRef, useState } from "react";
import type { Cell } from "@cogniarena/game-core";
import { canBlockMove, getBlockCells, sameCell } from "../engine/solver";
import type { Block, FixedBlock } from "../engine/types";

export interface BoardViewProps {
  gridSize?: number;
  rows?: number;
  cols?: number;
  redBall: Cell;
  target: Cell;
  blocks: Block[];
  fixedBlocks: FixedBlock[];
  onMoveBallTo?: (cell: Cell) => void;
  onMoveBall?: (direction: "up" | "down" | "left" | "right") => void;
  onMoveBlock?: (id: string, direction: "up" | "down" | "left" | "right") => void;
  onMoveBlockTo?: (id: string, to: Cell) => void;
  disabled?: boolean;
}

interface DragState {
  id: "ball" | string;
  startX: number;
  startY: number;
  initialR: number;
  initialC: number;
  targetR: number;
  targetC: number;
  visualDx: number;
  visualDy: number;
}

export function BoardView({
  gridSize: propGridSize,
  rows: propRows,
  cols: propCols,
  redBall,
  target,
  blocks,
  fixedBlocks,
  onMoveBallTo,
  onMoveBall,
  onMoveBlock,
  onMoveBlockTo,
  disabled = false,
}: BoardViewProps) {
  const rows = propRows ?? propGridSize ?? 8;
  const cols = propCols ?? propGridSize ?? 8;
  const maxDim = Math.max(rows, cols);

  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPiece, setSelectedPiece] = useState<"ball" | string>("ball");
  const [drag, setDrag] = useState<DragState | null>(null);

  // Keyboard navigation for selected piece
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

  // Precompute spatial lookups
  const blockCells = new Set<string>();
  blocks.flatMap(getBlockCells).forEach((c) => blockCells.add(`${c.row},${c.col}`));
  const fixedSet = new Set(fixedBlocks.map((f) => `${f.row},${f.col}`));

  const isFreeForBall = (r: number, c: number): boolean => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const key = `${r},${c}`;
    if (fixedSet.has(key) || blockCells.has(key)) return false;
    return true;
  };

  // Line of sight for ball click-to-move
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

  // Pointer drag start
  const handlePointerDown = (id: string | "ball", e: React.PointerEvent) => {
    if (disabled) return;
    setSelectedPiece(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    let initialR = 0;
    let initialC = 0;
    if (id === "ball") {
      initialR = redBall.row;
      initialC = redBall.col;
    } else {
      const b = blocks.find((blk) => blk.id === id);
      if (!b) return;
      initialR = b.row;
      initialC = b.col;
    }

    setDrag({
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialR,
      initialC,
      targetR: initialR,
      targetC: initialC,
      visualDx: 0,
      visualDy: 0,
    });
  };

  // Pointer move: dynamically calculates cell-by-cell offset and clamps at obstacles
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag || disabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cellPxX = rect.width / cols;
    const cellPxY = rect.height / rows;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    // Must move at least 6px to start tracking
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

    const isHorizontal = Math.abs(dx) >= Math.abs(dy);

    if (drag.id === "ball") {
      if (isHorizontal) {
        const rawSteps = Math.round(dx / cellPxX);
        const dir = rawSteps >= 0 ? 1 : -1;
        const requestedSteps = Math.abs(rawSteps);

        let validSteps = 0;
        for (let s = 1; s <= requestedSteps; s++) {
          const nextC = drag.initialC + dir * s;
          if (!isFreeForBall(drag.initialR, nextC)) break;
          validSteps = s;
          if (drag.initialR === target.row && nextC === target.col) break; // target reached
        }

        const targetC = drag.initialC + validSteps * dir;
        setDrag((prev) =>
          prev
            ? {
                ...prev,
                targetR: drag.initialR,
                targetC,
                visualDx: Math.max(-cellPxX * (drag.initialC - targetC), Math.min(cellPxX * (targetC - drag.initialC), dx)),
                visualDy: 0,
              }
            : null
        );
      } else {
        const rawSteps = Math.round(dy / cellPxY);
        const dir = rawSteps >= 0 ? 1 : -1;
        const requestedSteps = Math.abs(rawSteps);

        let validSteps = 0;
        for (let s = 1; s <= requestedSteps; s++) {
          const nextR = drag.initialR + dir * s;
          if (!isFreeForBall(nextR, drag.initialC)) break;
          validSteps = s;
          if (nextR === target.row && drag.initialC === target.col) break;
        }

        const targetR = drag.initialR + validSteps * dir;
        setDrag((prev) =>
          prev
            ? {
                ...prev,
                targetR,
                targetC: drag.initialC,
                visualDx: 0,
                visualDy: Math.max(-cellPxY * (drag.initialR - targetR), Math.min(cellPxY * (targetR - drag.initialR), dy)),
              }
            : null
        );
      }
    } else {
      // Obstacle block
      const b = blocks.find((blk) => blk.id === drag.id);
      if (!b) return;

      const otherBlocksSet = new Set<string>();
      for (const blk of blocks) {
        if (blk.id !== b.id) {
          getBlockCells(blk).forEach((c) => otherBlocksSet.add(`${c.row},${c.col}`));
        }
      }

      if (isHorizontal) {
        const rawSteps = Math.round(dx / cellPxX);
        const dir = rawSteps >= 0 ? 1 : -1;
        const requestedSteps = Math.abs(rawSteps);

        let validSteps = 0;
        for (let s = 1; s <= requestedSteps; s++) {
          if (!canBlockMove(b, 0, dir * s, redBall, target, { rows, cols }, fixedSet, otherBlocksSet)) break;
          validSteps = s;
        }

        const targetC = drag.initialC + validSteps * dir;
        setDrag((prev) =>
          prev
            ? {
                ...prev,
                targetR: drag.initialR,
                targetC,
                visualDx: Math.max(-cellPxX * (drag.initialC - targetC), Math.min(cellPxX * (targetC - drag.initialC), dx)),
                visualDy: 0,
              }
            : null
        );
      } else {
        const rawSteps = Math.round(dy / cellPxY);
        const dir = rawSteps >= 0 ? 1 : -1;
        const requestedSteps = Math.abs(rawSteps);

        let validSteps = 0;
        for (let s = 1; s <= requestedSteps; s++) {
          if (!canBlockMove(b, dir * s, 0, redBall, target, { rows, cols }, fixedSet, otherBlocksSet)) break;
          validSteps = s;
        }

        const targetR = drag.initialR + validSteps * dir;
        setDrag((prev) =>
          prev
            ? {
                ...prev,
                targetR,
                targetC: drag.initialC,
                visualDx: 0,
                visualDy: Math.max(-cellPxY * (drag.initialR - targetR), Math.min(cellPxY * (targetR - drag.initialR), dy)),
              }
            : null
        );
      }
    }
  };

  // Pointer drag release: smoothly drops piece at target cell in 1 move
  const handlePointerUp = () => {
    if (!drag || disabled) {
      setDrag(null);
      return;
    }

    if (drag.targetR !== drag.initialR || drag.targetC !== drag.initialC) {
      if (drag.id === "ball") {
        onMoveBallTo?.({ row: drag.targetR, col: drag.targetC });
      } else {
        if (onMoveBlockTo) {
          onMoveBlockTo(drag.id, { row: drag.targetR, col: drag.targetC });
        } else {
          // Fallback
          const dr = drag.targetR - drag.initialR;
          const dc = drag.targetC - drag.initialC;
          const dir = dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right";
          onMoveBlock?.(drag.id, dir);
        }
      }
    }

    setDrag(null);
  };

  const gapClass = maxDim >= 7 ? "gap-1" : "gap-1.5 sm:gap-2";
  const paddingClass = maxDim >= 7 ? "p-1.5 sm:p-2" : "p-2 sm:p-3";

  return (
    <div
      data-tutorial="grid"
      style={{
        aspectRatio: `${cols} / ${rows}`,
        width: `min(100%, calc(min(52vh, 440px) * ${cols} / ${rows}))`,
        maxWidth: "min(440px, 92vw)",
        maxHeight: "min(52vh, 440px)",
      }}
      className={`relative mx-auto ${paddingClass} rounded-2xl bg-slate-900/90 dark:bg-zinc-950 border border-slate-700/60 shadow-2xl select-none touch-none`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      {/* Background Grid Cells */}
      <div
        className={`relative w-full h-full grid ${gapClass} rounded-xl p-1 bg-slate-950/60`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const isTarget = sameCell({ row: r, col: c }, target);
            const isFixed = fixedSet.has(`${r},${c}`);
            const canTap = !disabled && !drag && isReachableLineOfSight(r, c);
            const isDropTarget =
              drag &&
              (drag.id === "ball"
                ? r === drag.targetR && c === drag.targetC
                : blocks.some((b) => {
                    if (b.id !== drag.id) return false;
                    const testBlock = { ...b, row: drag.targetR, col: drag.targetC };
                    return getBlockCells(testBlock).some((cell) => cell.row === r && cell.col === c);
                  }));

            return (
              <div
                key={`cell-${r}-${c}`}
                onClick={() => {
                  if (canTap && onMoveBallTo) {
                    setSelectedPiece("ball");
                    onMoveBallTo({ row: r, col: c });
                  }
                }}
                className={`relative rounded-lg transition-all flex items-center justify-center ${
                  isFixed
                    ? "bg-zinc-800 border border-zinc-700/70 shadow-inner"
                    : isTarget
                    ? "bg-zinc-900 border-2 border-dashed border-red-500/50"
                    : isDropTarget
                    ? "bg-indigo-900/40 border-2 border-indigo-400 shadow-md scale-[1.02]"
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

                {/* Fixed Obstacle Box Block */}
                {isFixed && (
                  <div
                    data-tutorial="fixed-wall"
                    className="w-full h-full rounded-lg bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center select-none"
                  >
                    <div className="w-1/2 h-1/2 rounded border border-slate-500/40 bg-slate-800/80 shadow-inner flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50" />
                    </div>
                  </div>
                )}

                {/* Line of sight indicator */}
                {canTap && !isTarget && !isDropTarget && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40 pointer-events-none" />
                )}
              </div>
            );
          })
        )}

        {/* Floating Elements Layer: Obstacle Blocks & Red Ball positioned precisely over cells */}
        <div className="absolute inset-1 pointer-events-none">
          <div ref={containerRef} className="relative w-full h-full">
            {/* Obstacle Blocks */}
            {blocks.map((b) => {
              const isBeingDragged = drag?.id === b.id;
              const displayRow = isBeingDragged ? drag.targetR : b.row;
              const displayCol = isBeingDragged ? drag.targetC : b.col;

              const widthPct = b.orientation === "h" ? (b.length / cols) * 100 : (1 / cols) * 100;
              const heightPct = b.orientation === "v" ? (b.length / rows) * 100 : (1 / rows) * 100;
              const leftPct = (displayCol / cols) * 100;
              const topPct = (displayRow / rows) * 100;

              const insetOffset = maxDim >= 7 ? "4px" : "6px";
              const posOffset = maxDim >= 7 ? "2px" : "3px";
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
                  className={`absolute rounded-xl shadow-lg border pointer-events-auto cursor-grab active:cursor-grabbing transition-all ${
                    isBeingDragged ? "duration-75 scale-[1.03] z-20 shadow-2xl" : "duration-200"
                  } flex items-center justify-center select-none ${
                    isSelected ? "border-white ring-2 ring-white/60 shadow-xl" : "border-white/30"
                  }`}
                >
                  {/* Grip dots (no arrow buttons) */}
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
            {(() => {
              const isBallDragged = drag?.id === "ball";
              const displayRow = isBallDragged ? drag.targetR : redBall.row;
              const displayCol = isBallDragged ? drag.targetC : redBall.col;

              return (
                <div
                  data-tutorial="red-ball"
                  onPointerDown={(e) => handlePointerDown("ball", e)}
                  style={{
                    width: `calc(${(1 / cols) * 100}% - ${maxDim >= 7 ? "6px" : "10px"})`,
                    height: `calc(${(1 / rows) * 100}% - ${maxDim >= 7 ? "6px" : "10px"})`,
                    left: `calc(${((displayCol + 0.5) / cols) * 100}% - calc(${
                      (1 / cols) * 50
                    }% - ${maxDim >= 7 ? "3px" : "5px"}))`,
                    top: `calc(${((displayRow + 0.5) / rows) * 100}% - calc(${
                      (1 / rows) * 50
                    }% - ${maxDim >= 7 ? "3px" : "5px"}))`,
                  }}
                  className={`absolute rounded-full pointer-events-auto cursor-grab active:cursor-grabbing transition-all ${
                    isBallDragged ? "duration-75 scale-110 z-30 shadow-[0_6px_24px_rgba(239,68,68,0.85)]" : "duration-200"
                  } shadow-[0_4px_16px_rgba(239,68,68,0.65)] bg-gradient-to-tr from-rose-700 via-red-500 to-rose-300 border-2 border-white/70 flex items-center justify-center`}
                >
                  <div className="w-1/3 h-1/3 rounded-full bg-white/60 -mt-1 -ml-1 blur-[0.5px]" />
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
