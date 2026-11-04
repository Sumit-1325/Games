# CogniArena — notes for Claude Code

This repo is a web app where students practise cognitive games from campus hiring tests. The first game is Grid Recall, modelled on Capgemini's Grid Challenge.

## Source of truth

- `PLAN.md` is the product and technical plan. It covers game rules, levels, screens, tech stack, folder structure, API, data model and roadmap. Read it before starting any feature.
- When a decision changes (stack, game rules, level numbers, API shape, schema), update `PLAN.md` in the same change, so the plan and the code don't drift apart.
- Tick off items in "Roadmap and next steps" as they're finished.

## Conventions

- TypeScript everywhere; pnpm workspaces + Turborepo.
- Game logic lives in `packages/games/<slug>/engine` as pure functions with no React or DOM code, and needs Vitest tests.
- Each game registers through a `manifest.ts` that matches the `GameManifest` interface in `PLAN.md`.
- UI: Tailwind + shadcn/ui; every screen must work in light and dark mode and respect reduced motion.
- Never use company logos or claim affiliation with any company.
