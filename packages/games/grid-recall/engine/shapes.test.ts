import { describe, expect, it } from "vitest";
import { createRng } from "@cogniarena/game-core";
import { L_TETROMINO, isChiral, isRotationOf, mirror, randomChiralShape, rotate, shapeKey } from "./shapes";

const square = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
];
const tBar = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 1, col: 1 },
];

describe("shapes", () => {
  it("four quarter turns bring a shape back to itself", () => {
    expect(shapeKey(rotate(rotate(L_TETROMINO, 2), 2))).toBe(shapeKey(L_TETROMINO));
  });

  it("L is chiral; square and T are not", () => {
    expect(isChiral(L_TETROMINO)).toBe(true);
    expect(isChiral(square)).toBe(false);
    expect(isChiral(tBar)).toBe(false);
  });

  it("a rotated chiral shape is a rotation; its mirror is not", () => {
    for (const t of [1, 2, 3] as const) {
      expect(isRotationOf(L_TETROMINO, rotate(L_TETROMINO, t))).toBe(true);
      expect(isRotationOf(L_TETROMINO, rotate(mirror(L_TETROMINO), t))).toBe(false);
    }
  });

  it("randomChiralShape returns connected chiral shapes of the right size", () => {
    const rng = createRng("shapes");
    for (const size of [4, 5, 6, 7]) {
      for (let i = 0; i < 50; i++) {
        const s = randomChiralShape(rng, size);
        expect(s).toHaveLength(size);
        expect(new Set(s.map((c) => `${c.row},${c.col}`)).size).toBe(size);
        expect(isChiral(s)).toBe(true);
      }
    }
  });
});
