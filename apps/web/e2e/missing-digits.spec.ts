/**
 * A guest plays Missing Digits: the automatic demo, a timed assessment, then a
 * Practice session whose saved, server-scored results they open.
 *
 * The bot reads the equation from the page, finds digits that make it true,
 * and taps them on the keypad like a player would.
 */
import { expect, test, type Page } from "@playwright/test";

type Op = "+" | "-" | "×" | "÷";

function evaluate(d: number[], ops: Op[]): number | null {
  let total = 0;
  let sign = 1;
  let term = d[0]!;
  for (let i = 0; i < ops.length; i++) {
    const x = d[i + 1]!;
    if (ops[i] === "×") term *= x;
    else if (ops[i] === "÷") {
      if (term % x) return null;
      term /= x;
    } else {
      total += sign * term;
      sign = ops[i] === "+" ? 1 : -1;
      term = x;
    }
  }
  return total + sign * term;
}

function solve(ops: Op[], target: number, picked: number[] = []): number[] | null {
  if (picked.length === ops.length + 1) return evaluate(picked, ops) === target ? picked : null;
  for (let d = 1; d <= 9; d++) {
    if (picked.includes(d)) continue;
    const found = solve(ops, target, [...picked, d]);
    if (found) return found;
  }
  return null;
}

/** Solves the equation on screen and presses `submitName`. */
async function solveOnScreen(page: Page, submitName: string) {
  const eq = page.locator('[data-tutorial="equation"]');
  const ops = ((await eq.getAttribute("data-ops")) ?? "").split(",") as Op[];
  const target = Number(await eq.getAttribute("data-target"));
  const digits = solve(ops, target);
  expect(digits, `no answer for ${ops.join(" ")} = ${target}`).not.toBeNull();
  for (const d of digits!) await page.getByRole("button", { name: `Digit ${d}`, exact: true }).click();
  await page.getByRole("button", { name: submitName, exact: true }).click();
}

test("guest: Missing Digits demo → timed assessment → levels go up", async ({ page }) => {
  await page.goto("/games/missing-digits");
  await page.getByRole("button", { name: "Start assessment" }).click();

  // Demo: the app solves an example, explains × before +, then the player tries one.
  await expect(page.getByText("× comes before +:")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Now you try" }).click();
  await solveOnScreen(page, "Check");
  await expect(page.getByRole("status")).toHaveText("Correct!");
  await page.getByRole("button", { name: "Start assessment" }).click();

  // Timed session starts straight away; solve level 1 (2 boxes) and level 2 (3 boxes).
  await expect(page.getByLabel("time left")).toHaveText(/^\d:\d\d$/, { timeout: 15_000 });
  for (const boxes of [2, 3]) {
    await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(`${boxes} boxes`)).toBeVisible();
    await solveOnScreen(page, "Submit");
    await expect(page.getByRole("status")).toContainText("Level passed");
  }
});

test("guest: Missing Digits practice → saved results", async ({ page }) => {
  await page.goto("/games/missing-digits");
  await expect(page.getByLabel("Rows")).toHaveCount(0); // no grid size for this game
  await page.getByRole("button", { name: "Start practice" }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible({ timeout: 10_000 });
  await solveOnScreen(page, "Submit");
  await expect(page.getByRole("status")).toContainText("Level passed");
  await page.getByRole("button", { name: "Finish" }).click();

  await page.getByRole("link", { name: /See saved results/ }).click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^Missing Digits · Practice/)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Your answer" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Pass" })).toBeVisible();
});
