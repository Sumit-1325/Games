import { createRng, type Cell, type Rng } from "@cogniarena/game-core";
import { getBlockCells, solvePuzzle } from "./solver";
import { getLevelSpec } from "./levels";
import type { Block, FixedBlock, MotionMazeConfig, MotionMazeLevel } from "./types";

const BLOCK_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface PuzzleTemplate {
  gridSize: number;
  redBall: Cell;
  target: Cell;
  blocks: { orientation: "h" | "v"; length: number; row: number; col: number }[];
  fixedBlocks?: Cell[];
}

// Handcrafted templates for levels 1 through 8
const LEVEL_TEMPLATES: Record<number, PuzzleTemplate[]> = {
  1: [
    {
      gridSize: 4,
      redBall: { row: 0, col: 0 },
      target: { row: 3, col: 3 },
      blocks: [{ orientation: "v", length: 2, row: 0, col: 2 }],
      fixedBlocks: [],
    },
    {
      gridSize: 4,
      redBall: { row: 1, col: 0 },
      target: { row: 1, col: 3 },
      blocks: [{ orientation: "v", length: 2, row: 0, col: 2 }],
      fixedBlocks: [],
    },
    {
      gridSize: 4,
      redBall: { row: 0, col: 1 },
      target: { row: 3, col: 1 },
      blocks: [{ orientation: "h", length: 2, row: 2, col: 0 }],
      fixedBlocks: [],
    },
  ],
  2: [
    {
      gridSize: 5,
      redBall: { row: 0, col: 0 },
      target: { row: 4, col: 4 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "h", length: 2, row: 2, col: 1 },
      ],
      fixedBlocks: [{ row: 1, col: 3 }],
    },
    {
      gridSize: 5,
      redBall: { row: 0, col: 1 },
      target: { row: 4, col: 3 },
      blocks: [
        { orientation: "h", length: 2, row: 1, col: 0 },
        { orientation: "v", length: 2, row: 1, col: 3 },
      ],
      fixedBlocks: [{ row: 3, col: 1 }],
    },
  ],
  3: [
    {
      gridSize: 6,
      redBall: { row: 0, col: 0 },
      target: { row: 5, col: 5 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "h", length: 2, row: 2, col: 0 },
        { orientation: "v", length: 3, row: 1, col: 4 },
      ],
      fixedBlocks: [
        { row: 1, col: 3 },
        { row: 4, col: 2 },
      ],
    },
    {
      gridSize: 6,
      redBall: { row: 0, col: 2 },
      target: { row: 5, col: 3 },
      blocks: [
        { orientation: "h", length: 2, row: 1, col: 1 },
        { orientation: "v", length: 2, row: 2, col: 2 },
        { orientation: "h", length: 3, row: 4, col: 1 },
      ],
      fixedBlocks: [
        { row: 2, col: 0 },
        { row: 3, col: 5 },
      ],
    },
  ],
  4: [
    {
      gridSize: 7,
      redBall: { row: 0, col: 0 },
      target: { row: 6, col: 6 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 3 },
        { orientation: "h", length: 3, row: 3, col: 1 },
        { orientation: "v", length: 2, row: 2, col: 5 },
        { orientation: "h", length: 2, row: 5, col: 3 },
      ],
      fixedBlocks: [
        { row: 1, col: 2 },
        { row: 4, col: 4 },
        { row: 5, col: 1 },
      ],
    },
    {
      gridSize: 7,
      redBall: { row: 1, col: 0 },
      target: { row: 6, col: 5 },
      blocks: [
        { orientation: "h", length: 2, row: 2, col: 2 },
        { orientation: "v", length: 3, row: 1, col: 4 },
        { orientation: "h", length: 2, row: 4, col: 0 },
        { orientation: "v", length: 2, row: 3, col: 3 },
      ],
      fixedBlocks: [
        { row: 0, col: 3 },
        { row: 3, col: 1 },
        { row: 5, col: 4 },
      ],
    },
  ],
  5: [
    {
      gridSize: 8,
      redBall: { row: 0, col: 0 },
      target: { row: 7, col: 7 },
      blocks: [
        { orientation: "v", length: 3, row: 0, col: 2 },
        { orientation: "h", length: 3, row: 2, col: 3 },
        { orientation: "v", length: 3, row: 3, col: 6 },
        { orientation: "h", length: 3, row: 5, col: 1 },
        { orientation: "v", length: 2, row: 4, col: 4 },
      ],
      fixedBlocks: [
        { row: 1, col: 5 },
        { row: 3, col: 1 },
        { row: 6, col: 2 },
        { row: 4, col: 7 },
      ],
    },
    {
      gridSize: 8,
      redBall: { row: 0, col: 3 },
      target: { row: 7, col: 4 },
      blocks: [
        { orientation: "h", length: 2, row: 1, col: 2 },
        { orientation: "v", length: 3, row: 2, col: 1 },
        { orientation: "h", length: 3, row: 3, col: 4 },
        { orientation: "v", length: 2, row: 4, col: 3 },
        { orientation: "h", length: 2, row: 6, col: 2 },
      ],
      fixedBlocks: [
        { row: 0, col: 5 },
        { row: 2, col: 4 },
        { row: 5, col: 1 },
        { row: 6, col: 6 },
      ],
    },
  ],
  6: [
    {
      gridSize: 8,
      redBall: { row: 0, col: 1 },
      target: { row: 7, col: 6 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 3 },
        { orientation: "h", length: 3, row: 2, col: 1 },
        { orientation: "v", length: 3, row: 2, col: 5 },
        { orientation: "h", length: 2, row: 4, col: 3 },
        { orientation: "v", length: 2, row: 4, col: 0 },
        { orientation: "h", length: 3, row: 6, col: 2 },
      ],
      fixedBlocks: [
        { row: 1, col: 2 },
        { row: 3, col: 4 },
        { row: 5, col: 1 },
        { row: 4, col: 7 },
        { row: 7, col: 3 },
      ],
    },
  ],
  7: [
    {
      gridSize: 8,
      redBall: { row: 0, col: 0 },
      target: { row: 7, col: 7 },
      blocks: [
        { orientation: "h", length: 3, row: 2, col: 0 },
        { orientation: "v", length: 3, row: 2, col: 4 },
        { orientation: "h", length: 3, row: 5, col: 3 },
        { orientation: "v", length: 3, row: 4, col: 1 },
        { orientation: "h", length: 2, row: 6, col: 5 },
        { orientation: "h", length: 2, row: 4, col: 6 },
      ],
      fixedBlocks: [
        { row: 0, col: 7 },
        { row: 7, col: 0 },
        { row: 3, col: 6 },
        { row: 6, col: 2 },
      ],
    },
  ],
  8: [
    {
      gridSize: 8,
      redBall: { row: 7, col: 7 },
      target: { row: 0, col: 0 },
      blocks: [
        { orientation: "h", length: 3, row: 5, col: 5 },
        { orientation: "v", length: 3, row: 3, col: 3 },
        { orientation: "h", length: 3, row: 2, col: 2 },
        { orientation: "v", length: 3, row: 1, col: 6 },
        { orientation: "h", length: 2, row: 1, col: 1 },
        { orientation: "h", length: 2, row: 3, col: 0 },
      ],
      fixedBlocks: [
        { row: 7, col: 0 },
        { row: 0, col: 7 },
        { row: 4, col: 1 },
        { row: 1, col: 5 },
      ],
    },
    {
      gridSize: 8,
      redBall: { row: 0, col: 0 },
      target: { row: 7, col: 7 },
      blocks: [
        { orientation: "h", length: 3, row: 2, col: 0 },
        { orientation: "v", length: 3, row: 2, col: 4 },
        { orientation: "h", length: 3, row: 5, col: 3 },
        { orientation: "v", length: 3, row: 4, col: 1 },
        { orientation: "h", length: 2, row: 6, col: 5 },
        { orientation: "h", length: 2, row: 4, col: 6 },
      ],
      fixedBlocks: [
        { row: 0, col: 7 },
        { row: 7, col: 0 },
        { row: 3, col: 6 },
        { row: 6, col: 2 },
      ],
    },
  ],
};

function transformTemplate(template: PuzzleTemplate, rng: Rng): PuzzleTemplate {
  const { gridSize } = template;
  const flipH = rng.chance(0.5);
  const flipV = rng.chance(0.5);

  const mapCell = (c: Cell): Cell => {
    let r = c.row;
    let col = c.col;
    if (flipH) col = gridSize - 1 - col;
    if (flipV) r = gridSize - 1 - r;
    return { row: r, col };
  };

  const mapBlock = (b: { orientation: "h" | "v"; length: number; row: number; col: number }) => {
    let r = b.row;
    let col = b.col;
    if (b.orientation === "h") {
      if (flipH) col = gridSize - b.length - col;
      if (flipV) r = gridSize - 1 - r;
    } else {
      if (flipH) col = gridSize - 1 - col;
      if (flipV) r = gridSize - b.length - r;
    }
    return {
      orientation: b.orientation,
      length: b.length,
      row: r,
      col,
    };
  };

  return {
    gridSize,
    redBall: mapCell(template.redBall),
    target: mapCell(template.target),
    blocks: template.blocks.map(mapBlock),
    fixedBlocks: (template.fixedBlocks ?? []).map(mapCell),
  };
}

/** Check if the ball can trivially solve the puzzle without moving any obstacle bars */
function canBallSolveAlone(
  gridSize: number,
  redBall: Cell,
  target: Cell,
  blocks: Block[],
  fixedBlocks: FixedBlock[]
): boolean {
  // Treat all blocks as fixed walls (cannot move)
  const allFixed: FixedBlock[] = [...fixedBlocks];
  for (const b of blocks) {
    for (const c of getBlockCells(b)) {
      allFixed.push(c);
    }
  }
  const res = solvePuzzle(gridSize, redBall, target, [], allFixed, 500);
  return res !== null && res.solvable;
}

/** Generate a procedural puzzle candidate */
function tryProcedural(
  gridSize: number,
  level: number,
  spec: ReturnType<typeof getLevelSpec>,
  rng: Rng
): { level: MotionMazeLevel; optimalMoves: number } | null {
  // Vary ball and target positions across the grid
  const quadrants = [
    { ball: { r: [0, 1], c: [0, 1] }, target: { r: [gridSize - 2, gridSize - 1], c: [gridSize - 2, gridSize - 1] } },
    { ball: { r: [0, 1], c: [gridSize - 2, gridSize - 1] }, target: { r: [gridSize - 2, gridSize - 1], c: [0, 1] } },
    { ball: { r: [gridSize - 2, gridSize - 1], c: [0, 1] }, target: { r: [0, 1], c: [gridSize - 2, gridSize - 1] } },
    { ball: { r: [gridSize - 2, gridSize - 1], c: [gridSize - 2, gridSize - 1] }, target: { r: [0, 1], c: [0, 1] } },
  ];
  const q = rng.pick(quadrants);

  const redBall: Cell = {
    row: rng.int(q.ball.r[0]!, q.ball.r[1]!),
    col: rng.int(q.ball.c[0]!, q.ball.c[1]!),
  };

  const target: Cell = {
    row: rng.int(q.target.r[0]!, q.target.r[1]!),
    col: rng.int(q.target.c[0]!, q.target.c[1]!),
  };

  const occupied = new Set<string>();
  occupied.add(`${redBall.row},${redBall.col}`);
  occupied.add(`${target.row},${target.col}`);

  // Place 1x1 box blocks (fixed obstacles)
  const fixedCount = rng.int(spec.fixedCount[0], spec.fixedCount[1]);
  const fixedBlocks: FixedBlock[] = [];
  for (let i = 0; i < fixedCount; i++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const r = rng.int(0, gridSize - 1);
      const c = rng.int(0, gridSize - 1);
      const key = `${r},${c}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        fixedBlocks.push({ row: r, col: c });
        break;
      }
    }
  }

  // Place sliding obstacle bars
  const barsCount = rng.int(spec.barsCount[0], spec.barsCount[1]);
  const blocks: Block[] = [];
  const colors = rng.shuffle(BLOCK_COLORS);

  for (let bi = 0; bi < barsCount; bi++) {
    const orientation: "h" | "v" = rng.chance(0.5) ? "h" : "v";
    const length = rng.chance(0.65) ? 2 : 3;

    for (let attempt = 0; attempt < 25; attempt++) {
      const maxR = orientation === "v" ? gridSize - length : gridSize - 1;
      const maxC = orientation === "h" ? gridSize - length : gridSize - 1;
      const r = rng.int(0, maxR);
      const c = rng.int(0, maxC);

      const cells = getBlockCells({ orientation, length, row: r, col: c });
      const overlaps = cells.some((cell) => occupied.has(`${cell.row},${cell.col}`));

      if (!overlaps) {
        cells.forEach((cell) => occupied.add(`${cell.row},${cell.col}`));
        blocks.push({
          id: `b${bi + 1}`,
          orientation,
          length,
          row: r,
          col: c,
          color: colors[bi % colors.length]!,
        });
        break;
      }
    }
  }

  // 1. Verify solvability (capped BFS states for fast candidate generation)
  const solved = solvePuzzle(gridSize, redBall, target, blocks, fixedBlocks, 3500);
  if (!solved || !solved.solvable) return null;

  // 2. For Level >= 3: Enforce that the puzzle cannot be solved by the ball alone!
  // The direct path must be blocked, requiring the player to move at least 1 obstacle.
  if (level >= 3 && canBallSolveAlone(gridSize, redBall, target, blocks, fixedBlocks)) {
    return null; // Too easy!
  }

  const resultLevel: MotionMazeLevel = {
    level,
    gridSize,
    redBall,
    target,
    blocks,
    fixedBlocks,
    optimalMoves: solved.optimalMoves,
  };

  return { level: resultLevel, optimalMoves: solved.optimalMoves };
}

export function generateLevel(seed: string, level: number, config: MotionMazeConfig = {}): MotionMazeLevel {
  const rng = createRng(seed);
  const spec = getLevelSpec(level);
  const gridSize = config.gridSize ?? spec.gridSize;

  let bestCandidate: MotionMazeLevel | null = null;
  let bestScore = -1;

  // 1. Try procedural generation up to 20 times
  for (let i = 0; i < 20; i++) {
    const candidate = tryProcedural(gridSize, level, spec, rng);
    if (candidate) {
      const { level: candLevel, optimalMoves } = candidate;

      // Check if candidate hits the target moves bracket
      if (optimalMoves >= spec.targetMoves[0] && optimalMoves <= spec.targetMoves[1]) {
        return candLevel;
      }

      // Track the hardest candidate found
      if (optimalMoves > bestScore) {
        bestScore = optimalMoves;
        bestCandidate = candLevel;
      }
    }
  }

  // If a valid procedural candidate was found that meets minimum difficulty, use it!
  if (bestCandidate && bestScore >= Math.max(2, spec.targetMoves[0] - 1)) {
    return bestCandidate;
  }

  // 2. Handcrafted diverse template fallback (templates exist for levels 1-8)
  const templateLevelKey = Math.min(8, Math.max(1, level));
  const templates = LEVEL_TEMPLATES[templateLevelKey] ?? LEVEL_TEMPLATES[8]!;
  const base = rng.pick(templates);
  const transformed = transformTemplate(base, rng);

  const colors = rng.shuffle(BLOCK_COLORS);
  const blocks: Block[] = transformed.blocks.map((b, idx) => ({
    id: `b${idx + 1}`,
    orientation: b.orientation,
    length: b.length,
    row: b.row,
    col: b.col,
    color: colors[idx % colors.length]!,
  }));

  const fixedBlocks: FixedBlock[] = transformed.fixedBlocks ?? [];
  const solved = solvePuzzle(transformed.gridSize, transformed.redBall, transformed.target, blocks, fixedBlocks);
  const optimalMoves = solved?.optimalMoves ?? spec.targetMoves[0];

  return {
    level,
    gridSize: transformed.gridSize,
    redBall: transformed.redBall,
    target: transformed.target,
    blocks,
    fixedBlocks,
    optimalMoves,
  };
}
