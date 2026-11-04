# CogniArena

Practise the cognitive games used in campus hiring tests. The first game is **Grid Recall**: remember the order in which balls blink on a grid while answering a shape-rotation question between every blink.

Product and technical plan: [PLAN.md](PLAN.md).

## Run it locally

Requirements: Node 20+ and pnpm (`npm i -g pnpm`).

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local   # set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm dev                                        # http://localhost:3000
```

With no `DATABASE_URL`, the app uses **PGlite**, a full Postgres that runs inside Node and stores its data in `apps/web/.data/pglite`. It migrates itself when the server starts. Delete that folder to reset all data.

Signing in with email works without an email service: the sign-in link is printed in the terminal running `pnpm dev`. Google sign-in appears once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

## Tests

```sh
pnpm test        # Vitest: game engine, game flow, session API (in-memory Postgres)
pnpm typecheck

# End-to-end in the installed Microsoft Edge, against a running server:
cd apps/web
pnpm build && BETTER_AUTH_URL=http://localhost:3210 pnpm start -p 3210
E2E_BASE_URL=http://localhost:3210 pnpm test:e2e
# Optional screenshots of the main screens, light and dark:
SCREENSHOTS=./screens E2E_BASE_URL=http://localhost:3210 pnpm test:e2e screenshots
```

## Deploy (Vercel + Neon)

1. Create a Postgres database on [Neon](https://neon.tech) (free tier) and copy its connection string.
2. Apply the schema: `DATABASE_URL=<neon url> pnpm --filter @cogniarena/db db:migrate`.
3. Import the repo in [Vercel](https://vercel.com). Set **Root Directory** to `apps/web`; Vercel detects pnpm and Next.js.
4. Add the environment variables (see `apps/web/.env.example`):
   - `DATABASE_URL`: the Neon URL
   - `BETTER_AUTH_SECRET`: a long random string
   - `BETTER_AUTH_URL`: your site URL, e.g. `https://cogniarena.vercel.app`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth client with redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`
   - `RESEND_API_KEY`, `EMAIL_FROM`: for magic-link emails (verify your sending domain in Resend)
   - `ADMIN_EMAILS`: your email, to get the Admin page
5. Deploy. After a schema change, run `pnpm --filter @cogniarena/db db:generate`, commit the new migration, and run `db:migrate` against Neon before deploying.

## Repo layout

```
apps/web                    Next.js app: pages, API routes, auth, session service
packages/game-core          Shared types (GameEngine, TutorialStep), seeded RNG
packages/games/grid-recall  Grid Recall: engine (pure), game flow (machine.ts), React components, tutorial
packages/ui                 Shared React UI: the coach-mark TutorialPlayer
packages/db                 Drizzle schema, migrations, Postgres/PGlite connection
```

## Adding a game

Create `packages/games/<slug>` with an engine (`generateLevel`, `scoreLevel`, `nextLevel`, config and responses schemas) and a `manifest.ts` exporting a `GameEngine`. Then add it to `apps/web/lib/registry.ts`. The session API, history, stats and admin page pick it up without changes.
