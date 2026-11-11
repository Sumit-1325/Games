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

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

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

function encodeState(ball: Cell, blocks: BlockPos[]): string {
  let s = `${ball.row},${ball.col}`;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    s += `|${b.row},${b.col}`;
  }
  return s;
}

/** Check if an entire block can move by (dr, dc) without collision */
export function canBlockMove(
  b: { orientation: "h" | "v"; length: number; row: number; col: number },
  dr: number,
  dc: number,
  ball: Cell,
  target: Cell,
  gridSize: number,
  fixedSet: Set<string>,
  otherBlocksSet: Set<string>
): boolean {
  for (const c of getBlockCells(b)) {
    const nr = c.row + dr;
    const nc = c.col + dc;
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return false;
    if (nr === ball.row && nc === ball.col) return false;
    if (nr === target.row && nc === target.col) return false;
    const key = `${nr},${nc}`;
    if (fixedSet.has(key)) return false;
    if (otherBlocksSet.has(key)) return false;
  }
  return true;
}

/**
 * Solves Motion Maze where both the ball and obstacle blocks can slide and stop
 * at any open cell along their straight-line path, with each placement counting as ONE move.
 */
export function solvePuzzle(
  gridSize: number,
  redBall: Cell,
  target: Cell,
  blocks: Block[],
  fixedBlocks: FixedBlock[] = [],
  maxStates = 40000
): SolverResult | null {
  if (sameCell(redBall, target)) {
    return { solvable: true, optimalMoves: 0, path: [] };
  }

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

  const ALL_DIRS: { dir: "up" | "down" | "left" | "right"; dr: number; dc: number }[] = [
    { dir: "up", dr: -1, dc: 0 },
    { dir: "down", dr: 1, dc: 0 },
    { dir: "left", dr: 0, dc: -1 },
    { dir: "right", dr: 0, dc: 1 },
  ];

  while (head < queue.length) {
    if (visited.size > maxStates) {
      return null;
    }

    const current = queue[head++]!;
    const { ball, blocks: curBlocks, moves } = current;

    if (sameCell(ball, target)) {
      return {
        solvable: true,
        optimalMoves: moves.length,
        path: moves,
      };
    }

    // Build spatial lookup for block cells
    const blockCellSet = new Set<string>();
    for (const b of curBlocks) {
      for (const c of getBlockCells(b)) {
        blockCellSet.add(`${c.row},${c.col}`);
      }
    }

    const isFreeForBall = (r: number, c: number): boolean => {
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
      const key = `${r},${c}`;
      if (fixedSet.has(key)) return false;
      if (blockCellSet.has(key)) return false;
      return true;
    };

    // 1. Straight-Line Ball Moves:
    // Can stop at any unobstructed cell along the ray, including intermediate stops and target
    for (const { dir, dr, dc } of ALL_DIRS) {
      let r = ball.row + dr;
      let c = ball.col + dc;

      while (isFreeForBall(r, c)) {
        const dest: Cell = { row: r, col: c };
        const key = encodeState(dest, curBlocks);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            ball: dest,
            blocks: curBlocks,
            moves: [
              ...moves,
              {
                piece: "ball",
                direction: dir,
                from: ball,
                to: dest,
              },
            ],
          });
        }
        if (r === target.row && c === target.col) {
          break; // Won level
        }
        r += dr;
        c += dc;
      }
    }

    // 2. Obstacle Block Moves:
    // Can stop at any unobstructed offset step along the ray (intermediate or end)
    for (let bi = 0; bi < curBlocks.length; bi++) {
      const b = curBlocks[bi]!;

      const otherBlocksSet = new Set<string>();
      for (let j = 0; j < curBlocks.length; j++) {
        if (j !== bi) {
          for (const c of getBlockCells(curBlocks[j]!)) {
            otherBlocksSet.add(`${c.row},${c.col}`);
          }
        }
      }

      for (const { dir, dr, dc } of ALL_DIRS) {
        let step = 1;
        while (
          canBlockMove(
            b,
            dr * step,
            dc * step,
            ball,
            target,
            gridSize,
            fixedSet,
            otherBlocksSet
          )
        ) {
          const newRow = b.row + dr * step;
          const newCol = b.col + dc * step;
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, row: newRow, col: newCol } : blk
          );
          const key = encodeState(ball, nextBlocks);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({
              ball,
              blocks: nextBlocks,
              moves: [
                ...moves,
                {
                  piece: b.id,
                  direction: dir,
                  from: { row: b.row, col: b.col },
                  to: { row: newRow, col: newCol },
                },
              ],
            });
          }
          step++;
        }
      }
    }
  }

  return null;
}
