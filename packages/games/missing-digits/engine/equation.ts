/**
 * Equations with blanks: d0 op0 d1 op1 d2 … = target.
 * Normal maths order applies: × and ÷ before + and −, then left to right.
 */
export type Op = "+" | "-" | "×" | "÷";

export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Value of the left-hand side. Returns null if a division leaves a remainder:
 * the generator never makes those, and an answer that needs one is wrong.
 */
export function evaluate(digits: readonly number[], ops: readonly Op[]): number | null {
  if (digits.length !== ops.length + 1 || digits.length === 0) return null;
  let total = 0;
  let sign = 1;
  let term = digits[0]!;
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const d = digits[i + 1]!;
    if (op === "×") term *= d;
    else if (op === "÷") {
      if (d === 0 || term % d !== 0) return null;
      term /= d;
    } else {
      total += sign * term;
      sign = op === "+" ? 1 : -1;
      term = d;
    }
  }
  return total + sign * term;
}

/** "3 + 4 × 2 = 11", with "□" for empty blanks. */
export function formatEquation(digits: readonly (number | null)[], ops: readonly Op[], target: number): string {
  const parts: string[] = [];
  digits.forEach((d, i) => {
    parts.push(d === null ? "□" : String(d));
    if (i < ops.length) parts.push(ops[i]!);
  });
  return `${parts.join(" ")} = ${target}`;
}

/** True when the digits fill every blank, are 1–9, are all different, and make the equation true. */
export function isSolution(digits: readonly (number | null)[], ops: readonly Op[], target: number): boolean {
  if (digits.length !== ops.length + 1) return false;
  if (digits.some((d) => d === null || !Number.isInteger(d) || d < 1 || d > 9)) return false;
  if (new Set(digits).size !== digits.length) return false;
  return evaluate(digits as number[], ops) === target;
}
