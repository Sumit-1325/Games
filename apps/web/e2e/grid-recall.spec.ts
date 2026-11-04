/**
 * A new guest learns Grid Recall, passes the practice round, unlocks
 * Assessment, plays a Practice session and opens the saved Results.
 *
 * The bot plays like a person would: it watches which cell lights up, works out
 * each shape answer from the drawn shapes, and taps the cells back in order.
 */
import { expect, test, type Page } from "@playwright/test";

type Pt = [number, number];

const key = (pts: Pt[]) => {
  const minR = Math.min(...pts.map((p) => p[0]));
  const minC = Math.min(...pts.map((p) => p[1]));
  return pts
    .map(([r, c]) => [r - minR, c - minC] as Pt)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map((p) => p.join(","))
    .join("|");
};
const rot = (pts: Pt[]): Pt[] => pts.map(([r, c]) => [c, -r]);

/** "yes" if the right shape is the left one rotated, else "no". */
function answerFor(left: Pt[], right: Pt[]): "yes" | "no" {
  let s = left;
  for (let i = 0; i < 4; i++, s = rot(s)) if (key(s) === key(right)) return "yes";
  return "no";
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const cells = (sel: string): [number, number][] =>
      [...document.querySelectorAll(`figure[data-tutorial="${sel}"] rect`)].map((r) => [
        Math.round(Number(r.getAttribute("y"))),
        Math.round(Number(r.getAttribute("x"))),
      ]);
    const ball = document.querySelector('[data-tutorial="grid"] button span.rounded-full')?.closest("button");
    const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent?.trim() ?? "");
    return {
      ball: ball?.getAttribute("aria-label") ?? null,
      left: cells("shape-left"),
      right: cells("shape-right"),
      askingShape: buttons.some((t) => t.startsWith("Yes")),
      recalling: buttons.includes("Submit"),
    };
  });
}

/** Plays one level perfectly. */
async function playLevel(page: Page) {
  const sequence: string[] = [];
  let answered = 0;
  for (let i = 0; i < 2000; i++) {
    const s = await snapshot(page);
    if (s.ball && !sequence.includes(s.ball)) sequence.push(s.ball);
    if (s.askingShape && s.left.length && answered < sequence.length) {
      const a = answerFor(s.left, s.right);
      await page.getByRole("button", { name: a === "yes" ? /^Yes/ : /^No/ }).click();
      answered++;
    }
    if (s.recalling) {
      for (const label of sequence) await page.getByRole("button", { name: label, exact: true }).click();
      await page.getByRole("button", { name: "Submit" }).click();
      return sequence.length;
    }
    await page.waitForTimeout(40);
  }
  throw new Error("level did not reach recall");
}

test("guest: tutorial → practice round → assessment unlocked → practice session → results", async ({ page }) => {
  await page.goto("/games/grid-recall");
  await expect(page.getByRole("radio", { name: /Assessment/ })).toBeDisabled();
  await page.getByRole("link", { name: "Start tutorial" }).click();

  // Coach-mark walkthrough: 10 steps.
  for (let i = 0; i < 9; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start practice" }).click();

  // Guided practice round: 3×3, 2 balls, right/wrong after each answer.
  await page.getByRole("button", { name: "Start practice round" }).click();
  await expect(await playLevel(page)).toBe(2);
  await expect(page.getByRole("heading", { name: "You're ready" })).toBeVisible({ timeout: 10_000 });

  // Lobby: Assessment is now unlocked. Start a 3×3 Practice session.
  await page.getByRole("link", { name: "Lobby" }).click();
  await expect(page.getByRole("radio", { name: /Assessment/ })).toBeEnabled();
  await page.getByRole("radio", { name: /Practice/ }).check();
  await page.getByLabel("Rows (practice)").selectOption("3");
  await page.getByLabel("Columns (practice)").selectOption("3");
  await page.getByRole("button", { name: "Start", exact: true }).click();

  await page.getByRole("button", { name: "Start practice" }).click();
  await playLevel(page);
  await expect(page.getByRole("status")).toContainText("Level passed");
  await page.getByRole("button", { name: "Finish" }).click();

  // Saved, server-scored results.
  await page.getByRole("link", { name: /See saved results/ }).click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Pass" })).toBeVisible();

  // History shows the session.
  await page.getByRole("link", { name: "History" }).first().click();
  await expect(page.getByRole("link", { name: "View" })).toHaveCount(1);
});

test("signed-out visitors are sent to sign-in for private pages", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fprofile/);
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
});
