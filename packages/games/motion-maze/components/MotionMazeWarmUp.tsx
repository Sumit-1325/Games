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

    const t1 = setTimeout(() => setDemoBarRow(2), 1200); // slide bar down
    const t2 = setTimeout(() => setDemoBall({ row: 0, col: 1 }), 2200); // ball right
    const t3 = setTimeout(() => setDemoBall({ row: 0, col: 2 }), 2900); // ball right
    const t4 = setTimeout(() => setDemoBall({ row: 0, col: 3 }), 3600); // ball right (goal)

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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
    const nr = tryBall.row + dr;
    const nc = tryBall.col + dc;

    if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4) return;
    // Check block collision
    if (nc === 2 && (nr === tryBarRow || nr === tryBarRow + 1)) return;

    const nextBall = { row: nr, col: nc };
    setTryBall(nextBall);

    if (sameCell(nextBall, tryTarget)) {
      setStep("answered");
    }
  };

  const handleTryMoveBlock = (id: string, dir: "up" | "down" | "left" | "right") => {
    if (step !== "try") return;
    if (dir === "down" && tryBarRow + 2 < 4) {
      // Check collision with ball
      if (tryBall.col === 2 && tryBall.row === tryBarRow + 2) return;
      setTryBarRow(tryBarRow + 1);
    } else if (dir === "up" && tryBarRow > 0) {
      if (tryBall.col === 2 && tryBall.row === tryBarRow - 1) return;
      setTryBarRow(tryBarRow - 1);
    }
  };

  const handleTryMoveBallTo = (cell: Cell) => {
    const dr = cell.row - tryBall.row;
    const dc = cell.col - tryBall.col;
    if (Math.abs(dr) + Math.abs(dc) === 1) {
      const dir = dr === -1 ? "up" : dr === 1 ? "down" : dc === -1 ? "left" : "right";
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
          {step === "show" && "Watch: The blue obstacle slides down out of the way so the red ball can reach the target."}
          {step === "try" && "Your turn: Slide the green bar down, then move the red ball into the black target!"}
          {step === "answered" && "Excellent! In the real test, boards have multiple sliding bars and fixed obstacle walls."}
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
            Click the arrows on the green bar to slide it, then tap adjacent cells to move the ball.
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

