"use client";

import { useEffect, useState } from "react";
import type { Cell } from "@cogniarena/game-core";
import { sameCell } from "../engine/solver";
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

  // State for the animated "show" demo
  const [demoBarRow, setDemoBarRow] = useState(0);
  const [demoBall, setDemoBall] = useState<Cell>({ row: 0, col: 0 });

  // State for the player's "try" puzzle
  const [tryBall, setTryBall] = useState<Cell>({ row: 1, col: 0 });
  const [tryBarRow, setTryBarRow] = useState(0);

  // Scripted animation for "show"
  useEffect(() => {
    if (step !== "show") return;

    // Reset demo state
    setDemoBarRow(0);
    setDemoBall({ row: 0, col: 0 });

    const t1 = setTimeout(() => setDemoBarRow(2), 1200); // 1 move: slide bar down
    const t2 = setTimeout(() => setDemoBall({ row: 0, col: 3 }), 2400); // 1 move: straight-line slide across to target

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  // Demo blocks configuration
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

  // Try puzzle blocks configuration
  const tryTarget: Cell = { row: 1, col: 3 };
  const tryBlocks: Block[] = [
    {
      id: "try-b1",
      orientation: "v",
      length: 2,
      row: tryBarRow,
      col: 2,
      color: "#10b981",
    },
  ];

  const handleTryMoveBall = (dir: "up" | "down" | "left" | "right") => {
    if (step !== "try") return;
    const dr = dir === "up" ? -1 : dir === "down" ? 1 : 0;
    const dc = dir === "left" ? -1 : dir === "right" ? 1 : 0;

    let nr = tryBall.row;
    let nc = tryBall.col;

    // Slide in straight line until blocked
    while (true) {
      const nextR = nr + dr;
      const nextC = nc + dc;
      if (nextR < 0 || nextR >= 4 || nextC < 0 || nextC >= 4) break;
      // Block collision
      if (nextC === 2 && (nextR === tryBarRow || nextR === tryBarRow + 1)) break;

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
    if (dir === "down" && tryBarRow + 2 < 4) {
      if (tryBall.col === 2 && (tryBall.row === tryBarRow + 1 || tryBall.row === tryBarRow + 2)) return;
      setTryBarRow(tryBarRow + 1);
    } else if (dir === "up" && tryBarRow > 0) {
      if (tryBall.col === 2 && tryBall.row === tryBarRow - 1) return;
      setTryBarRow(tryBarRow - 1);
    }
  };

  const handleTryMoveBallTo = (cell: Cell) => {
    if (step !== "try") return;
    // Check line of sight
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

      {/* Caption instruction */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 w-full">
        <p className="text-sm text-zinc-200">
          {step === "show" &&
            "Watch: 1 move slides the blue bar down. 1 move slides the red ball across the row directly into the target! Straight-line slides count as 1 move."}
          {step === "try" &&
            "Your turn: Slide the green bar down, then slide the red ball into the black target in 1 straight line!"}
          {step === "answered" &&
            "Well done! As levels advance, grids grow from 4×4 up to 8×8 with more obstacles. Reach the target in the fewest moves!"}
        </p>
      </div>

      {/* Demo or Try Board */}
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

      {/* Actions */}
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
            Click the arrows on the green bar to slide it, then click or swipe the ball toward the target.
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
