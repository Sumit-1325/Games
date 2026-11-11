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

// Curated templates for guaranteed instant fallback
const LEVEL_TEMPLATES: Record<number, PuzzleTemplate[]> = {
  1: [
    {
      gridSize: 5,
      redBall: { row: 0, col: 0 },
      target: { row: 0, col: 4 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "h", length: 2, row: 3, col: 1 },
      ],
      fixedBlocks: [],
    },
    {
      gridSize: 5,
      redBall: { row: 1, col: 0 },
      target: { row: 1, col: 4 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "v", length: 2, row: 2, col: 3 },
      ],
      fixedBlocks: [],
    },
    {
      gridSize: 5,
      redBall: { row: 0, col: 1 },
      target: { row: 4, col: 1 },
      blocks: [
        { orientation: "h", length: 2, row: 2, col: 0 },
        { orientation: "v", length: 2, row: 1, col: 3 },
      ],
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
        { orientation: "v", length: 2, row: 2, col: 3 },
      ],
      fixedBlocks: [],
    },
    {
      gridSize: 5,
      redBall: { row: 0, col: 1 },
      target: { row: 4, col: 3 },
      blocks: [
        { orientation: "h", length: 2, row: 1, col: 0 },
        { orientation: "v", length: 2, row: 1, col: 2 },
        { orientation: "h", length: 2, row: 3, col: 2 },
      ],
      fixedBlocks: [],
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
        { orientation: "v", length: 3, row: 1, col: 3 },
        { orientation: "h", length: 2, row: 4, col: 2 },
      ],
      fixedBlocks: [{ row: 3, col: 1 }],
    },
    {
      gridSize: 6,
      redBall: { row: 0, col: 2 },
      target: { row: 5, col: 3 },
      blocks: [
        { orientation: "h", length: 2, row: 1, col: 1 },
        { orientation: "v", length: 2, row: 2, col: 2 },
        { orientation: "v", length: 2, row: 1, col: 4 },
        { orientation: "h", length: 3, row: 4, col: 1 },
      ],
      fixedBlocks: [{ row: 2, col: 0 }],
    },
  ],
  4: [
    {
      gridSize: 6,
      redBall: { row: 0, col: 0 },
      target: { row: 5, col: 5 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "h", length: 2, row: 2, col: 1 },
        { orientation: "v", length: 2, row: 1, col: 4 },
        { orientation: "h", length: 3, row: 3, col: 2 },
        { orientation: "v", length: 2, row: 3, col: 0 },
      ],
      fixedBlocks: [
        { row: 1, col: 1 },
        { row: 4, col: 4 },
      ],
    },
  ],
  5: [
    {
      gridSize: 6,
      redBall: { row: 0, col: 0 },
      target: { row: 5, col: 4 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 1 },
        { orientation: "h", length: 2, row: 1, col: 2 },
        { orientation: "v", length: 3, row: 1, col: 4 },
        { orientation: "h", length: 2, row: 3, col: 0 },
        { orientation: "v", length: 2, row: 2, col: 2 },
        { orientation: "h", length: 2, row: 4, col: 2 },
      ],
      fixedBlocks: [
        { row: 0, col: 3 },
        { row: 5, col: 1 },
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

/** Try procedural generation with random placements */
function tryProcedural(gridSize: number, spec: ReturnType<typeof getLevelSpec>, rng: Rng): MotionMazeLevel | null {
  const redBall: Cell = {
    row: rng.int(0, 1),
    col: rng.int(0, 1),
  };

  const target: Cell = {
    row: rng.int(gridSize - 2, gridSize - 1),
    col: rng.int(gridSize - 2, gridSize - 1),
  };

  const occupied = new Set<string>();
  occupied.add(`${redBall.row},${redBall.col}`);
  occupied.add(`${target.row},${target.col}`);

  // Place fixed blocks
  const fixedCount = rng.int(spec.fixedCount[0], spec.fixedCount[1]);
  const fixedBlocks: FixedBlock[] = [];
  for (let i = 0; i < fixedCount; i++) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const r = rng.int(1, gridSize - 2);
      const c = rng.int(1, gridSize - 2);
      const key = `${r},${c}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        fixedBlocks.push({ row: r, col: c });
        break;
      }
    }
  }

  // Place sliding blocks
  const barsCount = rng.int(spec.barsCount[0], spec.barsCount[1]);
  const blocks: Block[] = [];
  const colors = rng.shuffle(BLOCK_COLORS);

  for (let bi = 0; bi < barsCount; bi++) {
    const orientation: "h" | "v" = rng.chance(0.5) ? "h" : "v";
    const length = rng.chance(0.7) ? 2 : 3;

    for (let attempt = 0; attempt < 20; attempt++) {
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

  // Verify solvability & optimal moves
  const solved = solvePuzzle(gridSize, redBall, target, blocks, fixedBlocks, 15000);
  if (!solved || !solved.solvable) return null;

  const [minMoves, maxMoves] = spec.targetMoves;
  if (solved.optimalMoves < minMoves || solved.optimalMoves > maxMoves) {
    return null;
  }

  return {
    level: 1, // overwritten by caller
    gridSize,
    redBall,
    target,
    blocks,
    fixedBlocks,
    optimalMoves: solved.optimalMoves,
  };
}

export function generateLevel(seed: string, level: number, config: MotionMazeConfig = {}): MotionMazeLevel {
  const rng = createRng(seed);
  const spec = getLevelSpec(level);
  const gridSize = config.gridSize ?? spec.gridSize;

  // 1. Try procedural generation up to 20 times
  for (let i = 0; i < 20; i++) {
    const candidate = tryProcedural(gridSize, spec, rng);
    if (candidate) {
      candidate.level = level;
      return candidate;
    }
  }

  // 2. Fall back to curated & transformed template
  const templates = LEVEL_TEMPLATES[Math.min(5, Math.max(1, level))] ?? LEVEL_TEMPLATES[5]!;
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

  // Recalculate optimal moves for the transformed template
  const solved = solvePuzzle(transformed.gridSize, transformed.redBall, transformed.target, blocks, fixedBlocks);
  const optimalMoves = solved?.optimalMoves ?? 5;

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

