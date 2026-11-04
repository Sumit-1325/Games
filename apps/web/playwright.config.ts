import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests (PLAN.md → "Testing"). Uses the installed Microsoft Edge, so
 * no browser download is needed. Point E2E_BASE_URL at a running server
 * (`pnpm build && pnpm start`); BETTER_AUTH_URL must match it.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "msedge",
    viewport: { width: 1280, height: 900 },
  },
});
