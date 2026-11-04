/**
 * Polyomino shapes for the distractor question ("is the right shape the left
 * one, just rotated?").
 *
 * A shape is a list of cells. Every function returns a *normalised* shape:
 * shifted so its top-left is (0, 0) and sorted, so two shapes are equal exactly
 * when their keys are equal.
 */
import type { Cell, Rng } from "@cogniarena/game-core";

export type Shape = Cell[];

/** Quarter turns clockwise: 1 = 90°, 2 = 180°, 3 = 270°. */
export type QuarterTurns = 0 | 1 | 2 | 3;

/** Shift to the origin and sort row-major. */
export function normalise(shape: Shape): Shape {
  const minRow = Math.min(...shape.map((c) => c.row));
  const minCol = Math.min(...shape.map((c) => c.col));
  return shape
    .map((c) => ({ row: c.row - minRow, col: c.col - minCol }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Stable string key, e.g. "0,0|1,0|2,0|2,1". */
export function shapeKey(shape: Shape): string {
  return normalise(shape)
    .map((c) => `${c.row},${c.col}`)
    .join("|");
}

/** Rotate 90° clockwise: (row, col) -> (col, -row). */
function rotate90(shape: Shape): Shape {
  return normalise(shape.map((c) => ({ row: c.col, col: -c.row })));
}

export function rotate(shape: Shape, turns: QuarterTurns): Shape {
  let out = normalise(shape);
  for (let i = 0; i < turns; i++) out = rotate90(out);
  return out;
}

/** Mirror left–right. */
export function mirror(shape: Shape): Shape {
  return normalise(shape.map((c) => ({ row: c.row, col: -c.col })));
}

/** Keys of the four rotations of a shape. */
function rotationKeys(shape: Shape): Set<string> {
  return new Set(([0, 1, 2, 3] as const).map((t) => shapeKey(rotate(shape, t))));
}

/**
 * A shape is chiral when no rotation of it matches its mirror image. Only chiral
 * shapes are allowed: for a symmetric shape the mirrored copy is also a rotated
 * copy, so "No" would never be the right answer.
 */
export function isChiral(shape: Shape): boolean {
  return !rotationKeys(shape).has(shapeKey(mirror(shape)));
}

/** True when `candidate` is `original` turned by some rotation (no mirroring). */
export function isRotationOf(original: Shape, candidate: Shape): boolean {
  return rotationKeys(original).has(shapeKey(candidate));
}

/** The classic 4-cell L used on the easiest levels. */
export const L_TETROMINO: Shape = normalise([
  { row: 0, col: 0 },
  { row: 1, col: 0 },
  { row: 2, col: 0 },
  { row: 2, col: 1 },
]);

/**
 * Grows a random connected polyomino of `size` cells, retrying until it is
 * chiral. Every chiral polyomino size we use (4–7) has plenty of chiral shapes,
 * so this finishes within a handful of tries.
 */
export function randomChiralShape(rng: Rng, size: number): Shape {
  if (size < 4) throw new Error("Chiral polyominoes need at least 4 cells");
  for (let attempt = 0; attempt < 1000; attempt++) {
    const cells: Cell[] = [{ row: 0, col: 0 }];
    const taken = new Set(["0,0"]);
    while (cells.length < size) {
      const from = rng.pick(cells);
      const [dr, dc] = rng.pick([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const);
      const next = { row: from.row + dr, col: from.col + dc };
      const key = `${next.row},${next.col}`;
      if (!taken.has(key)) {
        taken.add(key);
        cells.push(next);
      }
    }
    const shape = normalise(cells);
    if (isChiral(shape)) return shape;
  }
  throw new Error(`Could not grow a chiral shape of size ${size}`);
}
