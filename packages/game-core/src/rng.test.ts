import { describe, expect, it } from "vitest";
import { createRng, randomSeed } from "./rng";

describe("createRng", () => {
  it("gives the same sequence for the same seed", () => {
    const a = createRng("abc");
    const b = createRng("abc");
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it("gives different sequences for different seeds", () => {
    const a = createRng("abc");
    const b = createRng("abd");
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).every(Boolean);
    expect(same).toBe(false);
  });

  it("int() stays inside the inclusive range and hits both ends", () => {
    const rng = createRng("range");
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(2, 5);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it("shuffle() keeps every element", () => {
    const rng = createRng("shuffle");
    expect(rng.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("randomSeed", () => {
  it("returns 32 hex characters", () => {
    expect(randomSeed()).toMatch(/^[0-9a-f]{32}$/);
  });
});
