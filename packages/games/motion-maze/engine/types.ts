import { z } from "zod";
import type { Cell, LevelResult } from "@cogniarena/game-core";

export type Orientation = "h" | "v";
export type Direction = "up" | "down" | "left" | "right";

export interface Block {
  id: string;
  orientation: Orientation;
  length: number; // typically 2 or 3
  row: number; // top-most row (if vertical) or constant row (if horizontal)
  col: number; // left-most col (if horizontal) or constant col (if vertical)
  color: string;
}

export type FixedBlock = Cell;

export const motionMazeConfigSchema = z.object({
  gridSize: z.number().int().min(3).max(8).optional(),
  rows: z.number().int().min(3).max(8).optional(),
  cols: z.number().int().min(3).max(8).optional(),
});
export type MotionMazeConfig = z.infer<typeof motionMazeConfigSchema>;

export interface MotionMazeLevel {
  level: number;
  gridSize: number;
  rows?: number;
  cols?: number;
  redBall: Cell;
  target: Cell;
  blocks: Block[];
  fixedBlocks: FixedBlock[];
  optimalMoves: number;
}

export const motionMazeMoveSchema = z.object({
  piece: z.string(), // "ball" or block.id
  direction: z.enum(["up", "down", "left", "right"]),
  from: z.object({ row: z.number(), col: z.number() }),
  to: z.object({ row: z.number(), col: z.number() }),
});
export type MotionMazeMove = z.infer<typeof motionMazeMoveSchema>;

export const motionMazeResponsesSchema = z.object({
  completed: z.boolean(),
  moves: z.array(motionMazeMoveSchema),
  timeMs: z.number().int().nonnegative(),
});
export type MotionMazeResponses = z.infer<typeof motionMazeResponsesSchema>;

export interface MotionMazeResult extends LevelResult {
  detail?: {
    movesCount: number;
    optimalMoves: number;
    efficiency: number;
    completed: boolean;
    timeMs: number;
  };
}

