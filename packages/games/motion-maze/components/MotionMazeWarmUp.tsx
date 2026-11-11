"use client";

import { useEffect, useState } from "react";
import type { Cell } from "@cogniarena/game-core";
import { canBlockMove, sameCell } from "../engine/solver";
import type { Block } from "../engine/types";
import { BoardView } from "./BoardView";

type Step = "show" | "try" | "answered";

export function MotionMazeWarmUp({
  onStart,
  startLabel = "Start Assessment",
}: {
  onStart: () => void;
  startLabel?: string;
}) {
  const [step, setStep] = useState<Step>("show");

  const [demoBarRow, setDemoBarRow] = useState(0);
  const [demoBall, setDemoBall] = useState<Cell>({ row: 0, col: 0 });

  const [tryBall, setTryBall] = useState<Cell>({ row: 1, col: 0 });
  const [tryBarRow, setTryBarRow] = useState(0);
  const [tryBarCol, setTryBarCol] = useState(2);

  useEffect(() => {
    if (step !== "show") return;

    setDemoBarRow(0);
    setDemoBall({ row: 0, col: 0 });

    const t1 = setTimeout(() => setDemoBarRow(2), 1200);
    const t2 = setTimeout(() => setDemoBall({ row: 0, col: 3 }), 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  const demoBlocks: Block[] = [
    {
      id: "demo-b1",
      orientation: "v",
      length: 2,
      row: demoBarRow,
      col: 1,
      color: "#3b82f6",
    },
  ];

  const tryTarget: Cell = { row: 1, col: 3 };
  const tryBlocks: Block[] = [
    {
      id: "try-b1",
      orientation: "v",
      length: 2,
      row: tryBarRow,
      col: tryBarCol,
      color: "#10b981",
    },
  ];

  const handleTryMoveBall = (dir: "up" | "down" | "left" | "right") => {
    if (step !== "try") return;
    const dr = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const dc = dir === "left" ? -1 : dir === "right" ? 1 : 0;

    let nr = tryBall.row;
    let nc = tryBall.col;

    while (true) {
      const nextR = nr + dr;
      const nextC = nc + dc;
      if (nextR < 0 || nextR >= 4 || nextC < 0 || nextC >= 4) break;
      if (nextC === tryBarCol && (nextR === tryBarRow || nextR === tryBarRow + 1)) break;

      nr = nextR;
      nc = nextC;
      if (nr === tryTarget.row && nc === tryTarget.col) break;
    }

    if (nr !== tryBall.row || nc !== tryBall.col) {
      const nextBall = { row: nr, col: nc };
      setTryBall(nextBall);
      if (sameCell(nextBall, tryTarget)) {
        setStep("answered");
      }
    }
  };

  const handleTryMoveBlock = (id: string, dir: "up" | "down" | "left" | "right") => {
    if (step !== "try") return;
    const dr = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const dc = dir === "left" ? -1 : dir === "right" ? 1 : 0;

    let r = tryBarRow;
    let c = tryBarCol;
    while (
      canBlockMove({ orientation: "v", length: 2, row: r, col: c }, dr, dc, tryBall, tryTarget, 4, new Set(), new Set())
    ) {
      r += dr;
      c += dc;
    }

    if (r !== tryBarRow || c !== tryBarCol) {
      setTryBarRow(r);
      setTryBarCol(c);
    }
  };

  const handleTryMoveBallTo = (cell: Cell) => {
    if (step !== "try") return;
    if (cell.row === tryBall.row) {
      const dir = cell.col > tryBall.col ? "right" : "left";
      handleTryMoveBall(dir);
    } else if (cell.col === tryBall.col) {
      const dir = cell.row > tryBall.row ? "down" : "up";
      handleTryMoveBall(dir);
    }
  };

  return (
    <div className="flex w-full max-w-md mx-auto flex-col items-center gap-4 p-4 text-center select-none">
      <header className="flex w-full items-center justify-between text-sm">
        <span className="font-bold text-indigo-400">Tutorial Demo</span>
        <span className="text-zinc-500 text-xs">Practice warmup • Not scored</span>
      </header>

      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 w-full">
        <p className="text-sm text-zinc-200">
          {step === "show" &&
            "Watch: 1 move slides the obstacle bar. 1 move slides the red ball across the row directly into the target!"}
          {step === "try" &&
            "Your turn: Drag or swipe the green bar to slide it out of the way, then slide the red ball to the black target!"}
          {step === "answered" &&
            "Well done! As levels advance, grids grow from 4×4 up to 8×8 with more obstacles. Reach the target in the fewest moves!"}
        </p>
      </div>

      <div className="w-full flex justify-center py-2">
        {step === "show" ? (
          <BoardView
            gridSize={4}
            redBall={demoBall}
            target={{ row: 0, col: 3 }}
            blocks={demoBlocks}
            fixedBlocks={[]}
            disabled={true}
          />
        ) : (
          <BoardView
            gridSize={4}
            redBall={tryBall}
            target={tryTarget}
            blocks={tryBlocks}
            fixedBlocks={[]}
            onMoveBall={handleTryMoveBall}
            onMoveBallTo={handleTryMoveBallTo}
            onMoveBlock={handleTryMoveBlock}
            disabled={step === "answered"}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 w-full pt-2">
        {step === "show" && (
          <button
            type="button"
            onClick={() => setStep("try")}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg"
          >
            Try It Yourself
          </button>
        )}

        {step === "try" && (
          <p className="text-xs text-zinc-400">
            Swipe or drag the green bar to slide it, then drag or tap the ball toward the target.
          </p>
        )}

        {step === "answered" && (
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg animate-pulse"
          >
            {startLabel}
          </button>
        )}
      </div>
    </div>
  );
}
