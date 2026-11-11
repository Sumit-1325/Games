import type { Cell } from "@cogniarena/game-core";
import type { Block, FixedBlock, MotionMazeMove } from "./types";

export interface SolverResult {
  solvable: boolean;
  optimalMoves: number;
  path: MotionMazeMove[];
}

interface BlockPos {
  id: string;
  orientation: "h" | "v";
  length: number;
  row: number;
  col: number;
}

interface StateNode {
  ball: Cell;
  blocks: BlockPos[];
  moves: MotionMazeMove[];
}

/** Check if two cells are identical */
export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Returns all cells occupied by a block */
export function getBlockCells(block: { orientation: "h" | "v"; length: number; row: number; col: number }): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < block.length; i++) {
    cells.push({
      row: block.orientation === "v" ? block.row + i : block.row,
      col: block.orientation === "h" ? block.col + i : block.col,
    });
  }
  return cells;
}

/** Encodes state into a string for visited set */
function encodeState(ball: Cell, blocks: BlockPos[]): string {
  let s = `${ball.row},${ball.col}`;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    s += `|${b.row},${b.col}`;
  }
  return s;
}

export function solvePuzzle(
  gridSize: number,
  redBall: Cell,
  target: Cell,
  blocks: Block[],
  fixedBlocks: FixedBlock[] = [],
  maxStates = 30000
): SolverResult | null {
  // If ball already at target
  if (sameCell(redBall, target)) {
    return { solvable: true, optimalMoves: 0, path: [] };
  }

  // Pre-build set of fixed block positions
  const fixedSet = new Set<string>();
  for (const fb of fixedBlocks) {
    fixedSet.add(`${fb.row},${fb.col}`);
  }

  const initialBlocks: BlockPos[] = blocks.map((b) => ({
    id: b.id,
    orientation: b.orientation,
    length: b.length,
    row: b.row,
    col: b.col,
  }));

  const queue: StateNode[] = [
    {
      ball: { row: redBall.row, col: redBall.col },
      blocks: initialBlocks,
      moves: [],
    },
  ];

  const visited = new Set<string>();
  visited.add(encodeState(redBall, initialBlocks));

  let head = 0;

  while (head < queue.length) {
    if (visited.size > maxStates) {
      return null; // Search budget exceeded
    }

    const current = queue[head++]!;
    const { ball, blocks: curBlocks, moves } = current;

    // Check if target reached
    if (sameCell(ball, target)) {
      return {
        solvable: true,
        optimalMoves: moves.length,
        path: moves,
      };
    }

    // Build spatial grid lookup for current state:
    // 0: empty, 1: ball, 2: fixed, 3: target (for blocks), 4: block
    const blockCellSet = new Set<string>();
    for (const b of curBlocks) {
      for (const c of getBlockCells(b)) {
        blockCellSet.add(`${c.row},${c.col}`);
      }
    }

    // Helper to check if a cell is free for the Red Ball
    const isFreeForBall = (r: number, c: number): boolean => {
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
      const key = `${r},${c}`;
      if (fixedSet.has(key)) return false;
      if (blockCellSet.has(key)) return false;
      return true; // Target cell is valid for ball!
    };

    // Helper to check if a cell is free for a block to slide into
    const isFreeForBlock = (r: number, c: number): boolean => {
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
      if (r === ball.row && c === ball.col) return false;
      if (r === target.row && c === target.col) return false; // Blocks cannot cover target hole
      const key = `${r},${c}`;
      if (fixedSet.has(key)) return false;
      if (blockCellSet.has(key)) return false;
      return true;
    };

    // 1. Explore Ball moves (4 directions: up, down, left, right)
    const ballDirs: { dir: "up" | "down" | "left" | "right"; dr: number; dc: number }[] = [
      { dir: "up", dr: -1, dc: 0 },
      { dir: "down", dr: 1, dc: 0 },
      { dir: "left", dr: 0, dc: -1 },
      { dir: "right", dr: 0, dc: 1 },
    ];

    for (const { dir, dr, dc } of ballDirs) {
      const nr = ball.row + dr;
      const nc = ball.col + dc;
      if (isFreeForBall(nr, nc)) {
        const nextBall: Cell = { row: nr, col: nc };
        const key = encodeState(nextBall, curBlocks);
        if (!visited.has(key)) {
          visited.add(key);
          const nextMove: MotionMazeMove = {
            piece: "ball",
            direction: dir,
            from: ball,
            to: nextBall,
          };
          queue.push({
            ball: nextBall,
            blocks: curBlocks,
            moves: [...moves, nextMove],
          });
        }
      }
    }

    // 2. Explore Block moves
    for (let bi = 0; bi < curBlocks.length; bi++) {
      const b = curBlocks[bi]!;
      if (b.orientation === "h") {
        // Can slide left: checks cell (b.row, b.col - 1)
        if (isFreeForBlock(b.row, b.col - 1)) {
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, col: blk.col - 1 } : blk
          );
          const key = encodeState(ball, nextBlocks);
          if (!visited.has(key)) {
            visited.add(key);
            const nextMove: MotionMazeMove = {
              piece: b.id,
              direction: "left",
              from: { row: b.row, col: b.col },
              to: { row: b.row, col: b.col - 1 },
            };
            queue.push({
              ball,
              blocks: nextBlocks,
              moves: [...moves, nextMove],
            });
          }
        }
        // Can slide right: checks cell (b.row, b.col + b.length)
        if (isFreeForBlock(b.row, b.col + b.length)) {
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, col: blk.col + 1 } : blk
          );
          const key = encodeState(ball, nextBlocks);
          if (!visited.has(key)) {
            visited.add(key);
            const nextMove: MotionMazeMove = {
              piece: b.id,
              direction: "right",
              from: { row: b.row, col: b.col },
              to: { row: b.row, col: b.col + 1 },
            };
            queue.push({
              ball,
              blocks: nextBlocks,
              moves: [...moves, nextMove],
            });
          }
        }
      } else {
        // Vertical ("v")
        // Can slide up: checks cell (b.row - 1, b.col)
        if (isFreeForBlock(b.row - 1, b.col)) {
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, row: blk.row - 1 } : blk
          );
          const key = encodeState(ball, nextBlocks);
          if (!visited.has(key)) {
            visited.add(key);
            const nextMove: MotionMazeMove = {
              piece: b.id,
              direction: "up",
              from: { row: b.row, col: b.col },
              to: { row: b.row - 1, col: b.col },
            };
            queue.push({
              ball,
              blocks: nextBlocks,
              moves: [...moves, nextMove],
            });
          }
        }
        // Can slide down: checks cell (b.row + b.length, b.col)
        if (isFreeForBlock(b.row + b.length, b.col)) {
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, row: blk.row + 1 } : blk
          );
          const key = encodeState(ball, nextBlocks);
          if (!visited.has(key)) {
            visited.add(key);
            const nextMove: MotionMazeMove = {
              piece: b.id,
              direction: "down",
              from: { row: b.row, col: b.col },
              to: { row: b.row + 1, col: b.col },
            };
            queue.push({
              ball,
              blocks: nextBlocks,
              moves: [...moves, nextMove],
            });
          }
        }
      }
    }
  }

  return null;
}

