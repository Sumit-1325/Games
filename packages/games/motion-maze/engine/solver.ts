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

/**
 * Solves Motion Maze where moving a piece in a straight line counts as ONE move.
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

    const isFreeForBlock = (r: number, c: number): boolean => {
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return false;
      if (r === ball.row && c === ball.col) return false;
      if (r === target.row && c === target.col) return false;
      const key = `${r},${c}`;
      if (fixedSet.has(key)) return false;
      if (blockCellSet.has(key)) return false;
      return true;
    };

    // 1. Straight-Line Ball Moves:
    // A single move allows the ball to travel in a straight line along row/col.
    const ballDirs: { dir: "up" | "down" | "left" | "right"; dr: number; dc: number }[] = [
      { dir: "up", dr: -1, dc: 0 },
      { dir: "down", dr: 1, dc: 0 },
      { dir: "left", dr: 0, dc: -1 },
      { dir: "right", dr: 0, dc: 1 },
    ];

    for (const { dir, dr, dc } of ballDirs) {
      let r = ball.row + dr;
      let c = ball.col + dc;

      // Collect reachable stops along this straight line
      const stops: Cell[] = [];
      while (isFreeForBall(r, c)) {
        stops.push({ row: r, col: c });
        if (r === target.row && c === target.col) {
          // Reached the target hole! Stop ray immediately
          break;
        }
        r += dr;
        c += dc;
      }

      // In straight-line motion, the player can slide all the way to the end (or target),
      // or stop at intermediate cells along the straight line.
      // Exploring all valid stop positions along the straight line as 1 move:
      for (const dest of stops) {
        const key = encodeState(dest, curBlocks);
        if (!visited.has(key)) {
          visited.add(key);
          const nextMove: MotionMazeMove = {
            piece: "ball",
            direction: dir,
            from: ball,
            to: dest,
          };
          queue.push({
            ball: dest,
            blocks: curBlocks,
            moves: [...moves, nextMove],
          });
        }
      }
    }

    // 2. Straight-Line Block Moves:
    // Sliding an obstacle bar along its permitted axis by any number of empty cells = 1 move.
    for (let bi = 0; bi < curBlocks.length; bi++) {
      const b = curBlocks[bi]!;

      if (b.orientation === "h") {
        // Slide left
        let step = 1;
        while (isFreeForBlock(b.row, b.col - step)) {
          const newCol = b.col - step;
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, col: newCol } : blk
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
                  direction: "left",
                  from: { row: b.row, col: b.col },
                  to: { row: b.row, col: newCol },
                },
              ],
            });
          }
          step++;
        }

        // Slide right
        step = 1;
        while (isFreeForBlock(b.row, b.col + b.length + step - 1)) {
          const newCol = b.col + step;
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, col: newCol } : blk
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
                  direction: "right",
                  from: { row: b.row, col: b.col },
                  to: { row: b.row, col: newCol },
                },
              ],
            });
          }
          step++;
        }
      } else {
        // Vertical: slide up
        let step = 1;
        while (isFreeForBlock(b.row - step, b.col)) {
          const newRow = b.row - step;
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, row: newRow } : blk
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
                  direction: "up",
                  from: { row: b.row, col: b.col },
                  to: { row: newRow, col: b.col },
                },
              ],
            });
          }
          step++;
        }

        // Slide down
        step = 1;
        while (isFreeForBlock(b.row + b.length + step - 1, b.col)) {
          const newRow = b.row + step;
          const nextBlocks = curBlocks.map((blk, idx) =>
            idx === bi ? { ...blk, row: newRow } : blk
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
                  direction: "down",
                  from: { row: b.row, col: b.col },
                  to: { row: newRow, col: b.col },
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
