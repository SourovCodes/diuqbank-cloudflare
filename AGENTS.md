# DIU Question Bank — Agent Guide

Onboarding notes for AI coding agents. See [README.md](README.md) for the
human-facing overview.

## What This Is

A pnpm workspace monorepo with two Cloudflare deployables:

- **`apps/api`** (`diuqbank-api`) — Hono API on Cloudflare Workers: D1 + Drizzle,
  R2 for files, stateless JWT auth, hand-written OpenAPI, and a throttled PDF
  processing queue. Worker name: `diuqbank-api-prod`.
- **`apps/web`** (`diuqbank-web`) — React 19 + Vite + Tailwind 4 frontend using
  TanStack Query and React Router 7, deployed as a Wrangler assets-only Worker
  (SPA fallback). Worker name: `diuqbank-web-prod`.

Package manager: **pnpm 10.33.2** (pinned in the root `package.json`). One
lockfile at the root; never add per-app lockfiles.

## Layout

```text
package.json           Root: workspace scripts only (thin --filter wrappers)
pnpm-workspace.yaml    packages: apps/* ; onlyBuiltDependencies
apps/
  api/
    src/
      index.ts         App entry: builds Hono<AppEnv>, mounts routes, global onError, CORS
      types.ts         AppEnv / Bindings (DB, BUCKET, GOOGLE_CLIENT_ID, JWT_SECRET...)
      openapi.ts       Hand-written OpenAPI 3 doc
      queue.ts         PDF queue consumer
      db/              schema.ts (source of truth for tables + relations), client.ts
      middleware/      auth.ts: requireAuth / requireAdmin
      routes/          One file per route domain; admin/ auth applied once in its index.ts
      lib/             JWT, upload validation, shape helpers, taxonomy, PDF helpers
      shared/          API DTO types, Zod request schemas, pagination/title helpers
    drizzle/           Generated SQL migrations, applied by Wrangler
    wrangler.jsonc     Worker config: D1, R2, queues, rate limits, vars, secrets
  web/
    src/               React app: pages/, components/, hooks/, lib/, types/openapi.ts
    vite.config.ts     Dev server proxies /api -> API origin
    wrangler.jsonc     Assets-only Worker serving dist/ with SPA fallback
```

## Commands

Run from the repo root:

```bash
pnpm install
pnpm dev             # api + web dev servers in parallel
pnpm dev:api         # wrangler dev
pnpm dev:web         # vite (port 5173, strictPort)
pnpm typecheck       # all apps
pnpm lint            # all apps
pnpm build           # web production build
pnpm deploy:api
pnpm deploy:web

pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote
pnpm cf-typegen
```

Anything app-specific: `pnpm --filter diuqbank-api run <script>` or
`pnpm --filter diuqbank-web run <script>` (or `cd` into the app). Always pass
`run` explicitly with `--filter` — `pnpm deploy` without `run` is a pnpm
builtin, not the app's deploy script.

## API Conventions (`apps/api`)

- **Routing:** plain `Hono<AppEnv>` (no `@hono/zod-openapi`). Validate with
  `validate(target, schema)` from `src/lib/validator.ts`; it returns
  `400 { error, issues[] }`.
- **OpenAPI:** hand-written in `src/openapi.ts`; served at `/openapi.json` and
  rendered at `/docs`. Update it when endpoints change.
- **DB:** Drizzle + D1. `src/db/schema.ts` is the source of truth. Timestamps are
  Unix epoch seconds. `submissionCount` is maintained by SQLite triggers; do not
  write it from app code.
- **Errors:** throw `HTTPException`; global `onError` maps common D1 constraint
  failures to clean client errors.
- **Delete safety:** admin DELETE routes pre-count dependents and return `409`
  with a count rather than a misleading FK error.
- **Auth:** Google OAuth only. `POST /auth/google` verifies the Google ID token,
  find-or-creates the user by email, and returns a 7-day HS256 JWT. `verify`
  from `hono/jwt` needs the algorithm as the third argument:
  `verify(t, secret, "HS256")`.
- **Files:** R2 binding `BUCKET`. The Worker serves objects at
  `GET /files/:key{.+}`. Uploads are magic-byte validated.

## Web Conventions (`apps/web`)

- **API types:** generated into `src/types/openapi.ts` from the deployed
  `/openapi.json` via `pnpm --filter diuqbank-web run api:types`. Regenerate
  after backend contract changes.
- **API base:** same-origin `/api` by default; the Vite dev server proxies it
  to the deployed API (`VITE_DEV_API_PROXY_TARGET` overrides the target;
  `VITE_API_BASE_URL` overrides the base at build time).
- **Lint:** oxlint (not eslint).

## Gotchas

- Verify before declaring done: `pnpm typecheck && pnpm lint` (from the root).
- Secrets (`JWT_SECRET`, `ADMIN_EMAIL`, `PDF_PROCESSOR_API_KEY`,
  `GEMINI_API_KEY`) are Worker secrets; do not commit them. Local dev uses
  `apps/api/.dev.vars`.
- Do not install `@cloudflare/workers-types`; `wrangler types` generates
  `apps/api/worker-configuration.d.ts`.
- Migrations are applied via `wrangler d1 migrations apply`, not the Drizzle
  client.
