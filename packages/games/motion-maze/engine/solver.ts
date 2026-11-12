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
 * Fast BFS solver for Motion Maze.
 * Evaluates straight-line slide paths and placement steps, finding the shortest path in milliseconds.
 */
export function solvePuzzle(
  gridSize: number,
  redBall: Cell,
  target: Cell,
  blocks: Block[],
  fixedBlocks: FixedBlock[] = [],
  maxStates = 15000
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

    // 1. Ball Straight-Line Slide:
    // Slides along direction until hitting a wall, block, or target hole
    for (const { dir, dr, dc } of ALL_DIRS) {
      let r = ball.row + dr;
      let c = ball.col + dc;
      let lastR = ball.row;
      let lastC = ball.col;

      while (isFreeForBall(r, c)) {
        lastR = r;
        lastC = c;
        if (r === target.row && c === target.col) {
          break; // Hit target hole!
        }
        r += dr;
        c += dc;
      }

      if (lastR !== ball.row || lastC !== ball.col) {
        const dest: Cell = { row: lastR, col: lastC };
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
      }
    }

    // 2. Obstacle Block Slide:
    // Slides along direction to terminal stop or single step
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
        let maxStep = 0;
        while (
          canBlockMove(
            b,
            dr * (maxStep + 1),
            dc * (maxStep + 1),
            ball,
            target,
            gridSize,
            fixedSet,
            otherBlocksSet
          )
        ) {
          maxStep++;
        }

        if (maxStep > 0) {
          // Terminal slide
          const newRow = b.row + dr * maxStep;
          const newCol = b.col + dc * maxStep;
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

          // Single-step slide if maxStep > 1
          if (maxStep > 1) {
            const shortRow = b.row + dr;
            const shortCol = b.col + dc;
            const shortBlocks = curBlocks.map((blk, idx) =>
              idx === bi ? { ...blk, row: shortRow, col: shortCol } : blk
            );
            const shortKey = encodeState(ball, shortBlocks);
            if (!visited.has(shortKey)) {
              visited.add(shortKey);
              queue.push({
                ball,
                blocks: shortBlocks,
                moves: [
                  ...moves,
                  {
                    piece: b.id,
                    direction: dir,
                    from: { row: b.row, col: b.col },
                    to: { row: shortRow, col: shortCol },
                  },
                ],
              });
            }
          }
        }
      }
    }
  }

  return null;
}
