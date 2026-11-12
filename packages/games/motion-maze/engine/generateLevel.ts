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
  gridSize?: number;
  rows?: number;
  cols?: number;
  redBall: Cell;
  target: Cell;
  blocks: { orientation: "h" | "v"; length: number; row: number; col: number }[];
  fixedBlocks?: Cell[];
}

// Handcrafted templates for levels 1 through 8 (fallback only)
const LEVEL_TEMPLATES: Record<number, PuzzleTemplate[]> = {
  1: [
    {
      rows: 4, cols: 3, gridSize: 4,
      redBall: { row: 0, col: 0 }, target: { row: 3, col: 2 },
      blocks: [{ orientation: "v", length: 2, row: 1, col: 1 }],
      fixedBlocks: [],
    },
    {
      gridSize: 4,
      redBall: { row: 0, col: 0 }, target: { row: 3, col: 3 },
      blocks: [{ orientation: "v", length: 2, row: 0, col: 2 }],
      fixedBlocks: [],
    },
    {
      gridSize: 4,
      redBall: { row: 1, col: 0 }, target: { row: 1, col: 3 },
      blocks: [{ orientation: "v", length: 2, row: 0, col: 2 }],
      fixedBlocks: [],
    },
    {
      gridSize: 4,
      redBall: { row: 0, col: 1 }, target: { row: 3, col: 1 },
      blocks: [{ orientation: "h", length: 2, row: 2, col: 0 }],
      fixedBlocks: [],
    },
  ],
  2: [
    {
      gridSize: 5,
      redBall: { row: 0, col: 0 }, target: { row: 4, col: 4 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "h", length: 2, row: 2, col: 1 },
      ],
      fixedBlocks: [{ row: 1, col: 3 }],
    },
    {
      gridSize: 5,
      redBall: { row: 0, col: 1 }, target: { row: 4, col: 3 },
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
      redBall: { row: 0, col: 0 }, target: { row: 5, col: 5 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 2 },
        { orientation: "h", length: 2, row: 2, col: 0 },
        { orientation: "v", length: 3, row: 1, col: 4 },
      ],
      fixedBlocks: [{ row: 1, col: 3 }, { row: 4, col: 2 }],
    },
  ],
  4: [
    {
      gridSize: 7,
      redBall: { row: 0, col: 0 }, target: { row: 6, col: 6 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 3 },
        { orientation: "h", length: 3, row: 3, col: 1 },
        { orientation: "v", length: 2, row: 2, col: 5 },
        { orientation: "h", length: 2, row: 5, col: 3 },
      ],
      fixedBlocks: [{ row: 1, col: 2 }, { row: 4, col: 4 }, { row: 5, col: 1 }],
    },
  ],
  5: [
    {
      rows: 8, cols: 5, gridSize: 8,
      redBall: { row: 0, col: 0 }, target: { row: 7, col: 4 },
      blocks: [
        { orientation: "h", length: 2, row: 2, col: 0 },
        { orientation: "v", length: 2, row: 3, col: 2 },
        { orientation: "h", length: 2, row: 5, col: 2 },
      ],
      fixedBlocks: [
        { row: 0, col: 4 }, { row: 7, col: 0 },
        { row: 4, col: 1 }, { row: 4, col: 2 },
      ],
    },
    {
      gridSize: 8,
      redBall: { row: 0, col: 0 }, target: { row: 7, col: 7 },
      blocks: [
        { orientation: "v", length: 3, row: 0, col: 2 },
        { orientation: "h", length: 3, row: 2, col: 3 },
        { orientation: "v", length: 3, row: 3, col: 6 },
        { orientation: "h", length: 3, row: 5, col: 1 },
        { orientation: "v", length: 2, row: 4, col: 4 },
      ],
      fixedBlocks: [
        { row: 1, col: 5 }, { row: 3, col: 1 },
        { row: 6, col: 2 }, { row: 4, col: 7 },
      ],
    },
  ],
  6: [
    {
      gridSize: 8,
      redBall: { row: 0, col: 1 }, target: { row: 7, col: 6 },
      blocks: [
        { orientation: "v", length: 2, row: 0, col: 3 },
        { orientation: "h", length: 3, row: 2, col: 1 },
        { orientation: "v", length: 3, row: 2, col: 5 },
        { orientation: "h", length: 2, row: 4, col: 3 },
        { orientation: "v", length: 2, row: 4, col: 0 },
        { orientation: "h", length: 3, row: 6, col: 2 },
      ],
      fixedBlocks: [
        { row: 1, col: 2 }, { row: 3, col: 4 },
        { row: 5, col: 1 }, { row: 4, col: 7 }, { row: 7, col: 3 },
      ],
    },
  ],
  7: [
    {
      gridSize: 8,
      redBall: { row: 0, col: 0 }, target: { row: 7, col: 7 },
      blocks: [
        { orientation: "h", length: 3, row: 2, col: 0 },
        { orientation: "v", length: 3, row: 2, col: 4 },
        { orientation: "h", length: 3, row: 5, col: 3 },
        { orientation: "v", length: 3, row: 4, col: 1 },
        { orientation: "h", length: 2, row: 6, col: 5 },
        { orientation: "h", length: 2, row: 4, col: 6 },
      ],
      fixedBlocks: [
        { row: 0, col: 7 }, { row: 7, col: 0 },
        { row: 3, col: 6 }, { row: 6, col: 2 },
      ],
    },
  ],
  8: [
    {
      gridSize: 8,
      redBall: { row: 7, col: 7 }, target: { row: 0, col: 0 },
      blocks: [
        { orientation: "h", length: 3, row: 5, col: 5 },
        { orientation: "v", length: 3, row: 3, col: 3 },
        { orientation: "h", length: 3, row: 2, col: 2 },
        { orientation: "v", length: 3, row: 1, col: 6 },
        { orientation: "h", length: 2, row: 1, col: 1 },
        { orientation: "h", length: 2, row: 3, col: 0 },
      ],
      fixedBlocks: [
        { row: 7, col: 0 }, { row: 0, col: 7 },
        { row: 4, col: 1 }, { row: 1, col: 5 },
      ],
    },
    {
      gridSize: 8,
      redBall: { row: 0, col: 0 }, target: { row: 7, col: 7 },
      blocks: [
        { orientation: "h", length: 3, row: 2, col: 0 },
        { orientation: "v", length: 3, row: 2, col: 4 },
        { orientation: "h", length: 3, row: 5, col: 3 },
        { orientation: "v", length: 3, row: 4, col: 1 },
        { orientation: "h", length: 2, row: 6, col: 5 },
        { orientation: "h", length: 2, row: 4, col: 6 },
      ],
      fixedBlocks: [
        { row: 0, col: 7 }, { row: 7, col: 0 },
        { row: 3, col: 6 }, { row: 6, col: 2 },
      ],
    },
  ],
};

function transformTemplate(
  template: PuzzleTemplate,
  rng: Rng
): PuzzleTemplate & { rows: number; cols: number; gridSize: number } {
  const rows = template.rows ?? template.gridSize ?? 8;
  const cols = template.cols ?? template.gridSize ?? 8;
  const gridSize = Math.max(rows, cols);
  const flipH = rng.chance(0.5);
  const flipV = rng.chance(0.5);

  const mapCell = (c: Cell): Cell => {
    let r = c.row;
    let col = c.col;
    if (flipH) col = cols - 1 - col;
    if (flipV) r = rows - 1 - r;
    return { row: r, col };
  };

  const mapBlock = (b: { orientation: "h" | "v"; length: number; row: number; col: number }) => {
    let r = b.row;
    let col = b.col;
    if (b.orientation === "h") {
      if (flipH) col = cols - b.length - col;
      if (flipV) r = rows - 1 - r;
    } else {
      if (flipH) col = cols - 1 - col;
      if (flipV) r = rows - b.length - r;
    }
    return { orientation: b.orientation, length: b.length, row: r, col };
  };

  return {
    rows, cols, gridSize,
    redBall: mapCell(template.redBall),
    target: mapCell(template.target),
    blocks: template.blocks.map(mapBlock),
    fixedBlocks: (template.fixedBlocks ?? []).map(mapCell),
  };
}

// ── Strategic placement helpers ──────────────────────────────────────────────

/**
 * Compute the cells on every straight-line path the ball could slide from start
 * to target, treating only fixed blocks as walls (i.e. the path if no sliding
 * bars existed). Returns a Set of "row,col" keys that form the "corridor" the
 * ball wants to use.
 */
function computeBallCorridorBFS(
  rows: number,
  cols: number,
  ball: Cell,
  target: Cell,
  fixedSet: Set<string>
): Set<string> {
  const corridor = new Set<string>();
  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const visited = new Set<string>();
  const prev = new Map<string, string | null>();
  const queue: Cell[] = [ball];
  const key = (c: Cell) => `${c.row},${c.col}`;
  visited.add(key(ball));
  prev.set(key(ball), null);

  // BFS over slide moves (ball slides until hitting wall/fixed/boundary)
  let head = 0;
  let found = false;
  while (head < queue.length && !found) {
    const cur = queue[head++]!;
    for (const [dr, dc] of DIRS) {
      let r = cur.row + dr;
      let c = cur.col + dc;
      let lastR = cur.row;
      let lastC = cur.col;
      while (r >= 0 && r < rows && c >= 0 && c < cols && !fixedSet.has(`${r},${c}`)) {
        lastR = r;
        lastC = c;
        if (r === target.row && c === target.col) break;
        r += dr;
        c += dc;
      }
      const dest = { row: lastR, col: lastC };
      const dk = key(dest);
      if ((lastR !== cur.row || lastC !== cur.col) && !visited.has(dk)) {
        visited.add(dk);
        prev.set(dk, key(cur));
        queue.push(dest);
        if (lastR === target.row && lastC === target.col) {
          found = true;
          break;
        }
      }
    }
  }

  // Trace back from target to build corridor cells
  if (found) {
    let k: string | null | undefined = key(target);
    while (k != null) {
      corridor.add(k);
      k = prev.get(k);
    }
  }

  return corridor;
}

/**
 * Place a sliding bar so that it *crosses* the ball's corridor, forcing the
 * player to move it before the ball can pass.
 */
function placeBarOnCorridor(
  rows: number,
  cols: number,
  corridor: Set<string>,
  occupied: Set<string>,
  rng: Rng,
  preferredLength: number
): { orientation: "h" | "v"; length: number; row: number; col: number } | null {
  const corridorCells = [...corridor].map((k) => {
    const [r, c] = k.split(",").map(Number);
    return { row: r!, col: c! };
  });
  if (corridorCells.length === 0) return null;

  // Shuffle corridor cells for randomness
  const shuffled = rng.shuffle(corridorCells);

  for (const cell of shuffled) {
    // Try both orientations, prefer one that crosses the corridor
    const orientations: ("h" | "v")[] = rng.shuffle(["h", "v"]);
    for (const ori of orientations) {
      const length = preferredLength;
      // Try several anchor positions so the bar covers this corridor cell
      for (let offset = 0; offset < length; offset++) {
        const startRow = ori === "v" ? cell.row - offset : cell.row;
        const startCol = ori === "h" ? cell.col - offset : cell.col;

        // Boundary check
        if (startRow < 0 || startCol < 0) continue;
        if (ori === "v" && startRow + length > rows) continue;
        if (ori === "h" && startCol + length > cols) continue;

        const cells = getBlockCells({ orientation: ori, length, row: startRow, col: startCol });
        if (cells.some((c) => occupied.has(`${c.row},${c.col}`))) continue;

        return { orientation: ori, length, row: startRow, col: startCol };
      }
    }
  }
  return null;
}

/**
 * Place rigid fixed blocks strategically — some along the ball's corridor to
 * create chokepoints, some as adjacent pairs to form solid walls.
 */
function placeFixedBlocksStrategically(
  rows: number,
  cols: number,
  corridor: Set<string>,
  occupied: Set<string>,
  count: number,
  rng: Rng
): FixedBlock[] {
  const fixedBlocks: FixedBlock[] = [];
  let placed = 0;

  // Phase 1: Place ~40% of fixed blocks along corridor edges to narrow passages
  const corridorEdgeCells: Cell[] = [];
  const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const k of corridor) {
    const [r, c] = k.split(",").map(Number);
    for (const [dr, dc] of DIRS) {
      const nr = r! + dr;
      const nc = c! + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const nk = `${nr},${nc}`;
        if (!corridor.has(nk) && !occupied.has(nk)) {
          corridorEdgeCells.push({ row: nr, col: nc });
        }
      }
    }
  }

  const corridorCount = Math.min(Math.ceil(count * 0.4), corridorEdgeCells.length);
  const shuffledEdges = rng.shuffle(corridorEdgeCells);
  for (let i = 0; i < corridorCount && placed < count; i++) {
    const cell = shuffledEdges[i]!;
    const k = `${cell.row},${cell.col}`;
    if (occupied.has(k)) continue;
    occupied.add(k);
    fixedBlocks.push(cell);
    placed++;
  }

  // Phase 2: Place remaining as adjacent pairs (rigid 2-block walls)
  while (placed < count) {
    const remaining = count - placed;
    const makePair = remaining >= 2 && rng.chance(0.7);

    let success = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const r = rng.int(0, rows - 1);
      const c = rng.int(0, cols - 1);
      const key = `${r},${c}`;
      if (occupied.has(key)) continue;

      if (makePair) {
        const dirs: [number, number][] = rng.shuffle([[0, 1], [0, -1], [1, 0], [-1, 0]]);
        let neighbor: [number, number] | null = null;
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !occupied.has(`${nr},${nc}`)) {
            neighbor = [nr, nc];
            break;
          }
        }
        if (neighbor) {
          occupied.add(key);
          occupied.add(`${neighbor[0]},${neighbor[1]}`);
          fixedBlocks.push({ row: r, col: c });
          fixedBlocks.push({ row: neighbor[0], col: neighbor[1] });
          placed += 2;
          success = true;
          break;
        }
      } else {
        occupied.add(key);
        fixedBlocks.push({ row: r, col: c });
        placed++;
        success = true;
        break;
      }
    }
    if (!success) break;
  }

  return fixedBlocks;
}

/** Check if the ball can trivially solve the puzzle without moving any obstacle bars */
function canBallSolveAlone(
  grid: { rows: number; cols: number },
  redBall: Cell,
  target: Cell,
  blocks: Block[],
  fixedBlocks: FixedBlock[]
): boolean {
  const allFixed: FixedBlock[] = [...fixedBlocks];
  for (const b of blocks) {
    for (const c of getBlockCells(b)) {
      allFixed.push(c);
    }
  }
  const res = solvePuzzle(grid, redBall, target, [], allFixed, 500);
  return res !== null && res.solvable;
}

// ── Main procedural generator ────────────────────────────────────────────────

/**
 * Generates a procedural puzzle that is guaranteed to be:
 * 1. Solvable (verified by BFS)
 * 2. NOT trivially solvable by the ball alone (for level >= 2)
 * 3. Strategically challenging — bars cross the ball's natural path
 */
function tryProcedural(
  rows: number,
  cols: number,
  level: number,
  spec: ReturnType<typeof getLevelSpec>,
  rng: Rng
): { level: MotionMazeLevel; optimalMoves: number } | null {
  // ── Step 1: Place ball and target far apart ────────────────────────────────
  // Use corners/edges but ensure Manhattan distance is meaningful
  const positions = generateStartTarget(rows, cols, level, rng);
  const redBall = positions.ball;
  const target = positions.target;

  const occupied = new Set<string>();
  occupied.add(`${redBall.row},${redBall.col}`);
  occupied.add(`${target.row},${target.col}`);

  // ── Step 2: Place fixed blocks strategically ───────────────────────────────
  // Compute the ball's "natural corridor" (path with no bars) so we can block it
  const fixedCount = rng.int(spec.fixedCount[0], spec.fixedCount[1]);
  const baseFixedSet = new Set<string>();
  const corridor = computeBallCorridorBFS(rows, cols, redBall, target, baseFixedSet);

  const fixedBlocks = placeFixedBlocksStrategically(
    rows, cols, corridor, occupied, fixedCount, rng
  );

  // Build fixed set for further checks
  const fixedSet = new Set<string>();
  for (const fb of fixedBlocks) fixedSet.add(`${fb.row},${fb.col}`);

  // ── Step 3: Place sliding bars — some crossing the corridor ────────────────
  const barsCount = rng.int(spec.barsCount[0], spec.barsCount[1]);
  const blocks: Block[] = [];
  const colors = rng.shuffle(BLOCK_COLORS);

  // Recompute corridor with fixed blocks placed
  const corridorWithFixed = computeBallCorridorBFS(rows, cols, redBall, target, fixedSet);

  // Place at least 1 bar crossing the corridor (for level >= 2)
  const crossingBarsTarget = level >= 2 ? Math.max(1, Math.floor(barsCount * 0.4)) : 0;
  let crossingPlaced = 0;

  for (let bi = 0; bi < barsCount; bi++) {
    let barLength = rng.chance(0.6) ? 2 : 3;
    if (rows <= 3 || cols <= 3) barLength = 2;

    let bar: { orientation: "h" | "v"; length: number; row: number; col: number } | null = null;

    // Try corridor-crossing placement first
    if (crossingPlaced < crossingBarsTarget && corridorWithFixed.size > 0) {
      bar = placeBarOnCorridor(rows, cols, corridorWithFixed, occupied, rng, barLength);
      if (bar) crossingPlaced++;
    }

    // Fallback to random placement
    if (!bar) {
      bar = placeBarRandomly(rows, cols, occupied, rng, barLength);
    }

    if (bar) {
      const cells = getBlockCells(bar);
      cells.forEach((c) => occupied.add(`${c.row},${c.col}`));
      blocks.push({
        id: `b${bi + 1}`,
        orientation: bar.orientation,
        length: bar.length,
        row: bar.row,
        col: bar.col,
        color: colors[bi % colors.length]!,
      });
    }
  }

  // ── Step 4: Verify solvability ─────────────────────────────────────────────
  const gridDim = { rows, cols };
  // Use generous BFS cap — we want harder puzzles, not just quick-to-verify ones
  const solved = solvePuzzle(gridDim, redBall, target, blocks, fixedBlocks, 8000);
  if (!solved || !solved.solvable) return null;

  // ── Step 5: Reject trivially easy puzzles ──────────────────────────────────
  // For level >= 2: the ball must NOT be able to solve alone (must move a bar)
  if (level >= 2 && canBallSolveAlone(gridDim, redBall, target, blocks, fixedBlocks)) {
    return null;
  }

  // For level >= 4: require at least 2 bar moves in the optimal solution
  if (level >= 4) {
    const barMoves = solved.path.filter((m) => m.piece !== "ball").length;
    if (barMoves < 1) return null;
  }

  const resultLevel: MotionMazeLevel = {
    level,
    gridSize: Math.max(rows, cols),
    rows,
    cols,
    redBall,
    target,
    blocks,
    fixedBlocks,
    optimalMoves: solved.optimalMoves,
  };

  return { level: resultLevel, optimalMoves: solved.optimalMoves };
}

/**
 * Generate ball and target positions with meaningful distance.
 * For higher levels, avoid pure corner-to-corner to create less obvious paths.
 */
function generateStartTarget(
  rows: number,
  cols: number,
  level: number,
  rng: Rng
): { ball: Cell; target: Cell } {
  // Placement strategies — mix of corner, edge, and interior starts
  type Strategy = () => { ball: Cell; target: Cell };

  // Strategy 1: Opposite corners (classic)
  const cornerToCorner: Strategy = () => {
    const corners: Cell[] = [
      { row: 0, col: 0 },
      { row: 0, col: cols - 1 },
      { row: rows - 1, col: 0 },
      { row: rows - 1, col: cols - 1 },
    ];
    const ball = rng.pick(corners);
    const target = { row: rows - 1 - ball.row, col: cols - 1 - ball.col };
    return { ball, target };
  };

  // Strategy 2: Edge to opposite edge (forces non-diagonal path)
  const edgeToEdge: Strategy = () => {
    const side = rng.int(0, 3); // 0=top, 1=bottom, 2=left, 3=right
    let ball: Cell;
    let target: Cell;
    if (side === 0) {
      ball = { row: 0, col: rng.int(0, cols - 1) };
      target = { row: rows - 1, col: rng.int(0, cols - 1) };
    } else if (side === 1) {
      ball = { row: rows - 1, col: rng.int(0, cols - 1) };
      target = { row: 0, col: rng.int(0, cols - 1) };
    } else if (side === 2) {
      ball = { row: rng.int(0, rows - 1), col: 0 };
      target = { row: rng.int(0, rows - 1), col: cols - 1 };
    } else {
      ball = { row: rng.int(0, rows - 1), col: cols - 1 };
      target = { row: rng.int(0, rows - 1), col: 0 };
    }
    return { ball, target };
  };

  // Strategy 3: One in interior, one on edge (harder — no wall bounce shortcut)
  const edgeToInterior: Strategy = () => {
    const ball: Cell = {
      row: rng.chance(0.5) ? (rng.chance(0.5) ? 0 : rows - 1) : rng.int(0, rows - 1),
      col: rng.chance(0.5) ? (rng.chance(0.5) ? 0 : cols - 1) : rng.int(0, cols - 1),
    };
    // Target in the interior zone (not on the very edge)
    const target: Cell = {
      row: rng.int(1, rows - 2),
      col: rng.int(1, cols - 2),
    };
    // Ensure they're not the same
    if (ball.row === target.row && ball.col === target.col) {
      target.row = (target.row + 1) % rows;
    }
    return { ball, target };
  };

  // Choose strategy based on level
  const strategies: Strategy[] =
    level <= 2
      ? [cornerToCorner, edgeToEdge]
      : level <= 4
        ? [cornerToCorner, edgeToEdge, edgeToEdge, edgeToInterior]
        : [edgeToEdge, edgeToEdge, edgeToInterior, edgeToInterior];

  return rng.pick(strategies)();
}

/**
 * Place a bar at a random valid position.
 */
function placeBarRandomly(
  rows: number,
  cols: number,
  occupied: Set<string>,
  rng: Rng,
  preferredLength: number
): { orientation: "h" | "v"; length: number; row: number; col: number } | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const orientation: "h" | "v" = rng.chance(0.5) ? "h" : "v";
    let length = preferredLength;
    if (orientation === "v" && rows <= 3) length = 2;
    if (orientation === "h" && cols <= 3) length = 2;

    const maxR = orientation === "v" ? rows - length : rows - 1;
    const maxC = orientation === "h" ? cols - length : cols - 1;
    if (maxR < 0 || maxC < 0) continue;

    const r = rng.int(0, maxR);
    const c = rng.int(0, maxC);

    const cells = getBlockCells({ orientation, length, row: r, col: c });
    if (cells.some((cell) => occupied.has(`${cell.row},${cell.col}`))) continue;

    return { orientation, length, row: r, col: c };
  }
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function generateLevel(
  seed: string,
  level: number,
  config: MotionMazeConfig = {}
): MotionMazeLevel {
  const rng = createRng(seed);
  const spec = getLevelSpec(level);

  // Determine rectangular dimensions
  let rows: number;
  let cols: number;
  if (config.rows && config.cols) {
    rows = config.rows;
    cols = config.cols;
  } else if (config.gridSize) {
    rows = config.gridSize;
    cols = config.gridSize;
  } else {
    const dim = rng.pick(spec.gridDimensions);
    rows = dim[0];
    cols = dim[1];
  }

  let bestCandidate: MotionMazeLevel | null = null;
  let bestScore = -1;

  // Try procedural generation up to 30 times — more attempts = better puzzle selection
  for (let i = 0; i < 30; i++) {
    const candidate = tryProcedural(rows, cols, level, spec, rng);
    if (candidate) {
      const { level: candLevel, optimalMoves } = candidate;

      // Perfect hit: within target moves bracket
      if (optimalMoves >= spec.targetMoves[0] && optimalMoves <= spec.targetMoves[1]) {
        return candLevel;
      }

      // Track the best candidate (highest optimal moves = hardest)
      if (optimalMoves > bestScore) {
        bestScore = optimalMoves;
        bestCandidate = candLevel;
      }
    }
  }

  // Accept best procedural candidate if it's at least moderately difficult
  if (bestCandidate && bestScore >= Math.max(2, spec.targetMoves[0] - 1)) {
    return bestCandidate;
  }

  // Fallback to handcrafted templates (should rarely happen now)
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
  const solved = solvePuzzle(
    { rows: transformed.rows, cols: transformed.cols },
    transformed.redBall,
    transformed.target,
    blocks,
    fixedBlocks,
    5000
  );
  const optimalMoves = solved?.optimalMoves ?? spec.targetMoves[0];

  return {
    level,
    gridSize: transformed.gridSize,
    rows: transformed.rows,
    cols: transformed.cols,
    redBall: transformed.redBall,
    target: transformed.target,
    blocks,
    fixedBlocks,
    optimalMoves,
  };
}
