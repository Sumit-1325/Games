/**
 * Visual check, not an assertion test: saves screenshots of the main screens in
 * light and dark mode. Runs only when SCREENSHOTS=<folder> is set.
 */
import { test, type Page } from "@playwright/test";

const dir = process.env.SCREENSHOTS;
test.skip(!dir, "set SCREENSHOTS=<folder> to capture screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${dir}/${name}.png` });
}

for (const scheme of ["light", "dark"] as const) {
  test(`screens (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/dashboard");
    await shot(page, `${scheme}-dashboard`);

    await page.goto("/games/grid-recall/tutorial");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(500);
    await shot(page, `${scheme}-tutorial-shape`);

    await page.goto("/games/grid-recall/play?mode=practice&rows=5&cols=5");
    await page.getByRole("button", { name: "Start practice" }).click();
    await page.getByRole("button", { name: /^Yes/ }).waitFor({ timeout: 10_000 });
    await page.waitForTimeout(300);
    await shot(page, `${scheme}-shape-question`);
  });
}
