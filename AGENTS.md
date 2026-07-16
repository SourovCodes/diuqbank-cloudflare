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
- **`packages/shared`** (`@diuqbank/shared`) — tiny internal package (consumed
  as TypeScript source, no build step) holding constants both sides must agree
  on: upload size limits, accepted MIME types, pagination caps.

Package manager: **pnpm 10.33.2** (pinned in the root `package.json`). One
lockfile at the root; never add per-app lockfiles. Versions of tooling used by
more than one package (`typescript`, `wrangler`) are pinned once in the
`catalog:` block of `pnpm-workspace.yaml` — reference them as `"catalog:"` in
package.json, don't hardcode versions in two places.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, build, and fails if
`apps/web/src/types/openapi.ts` wasn't regenerated after an API contract
change.

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
packages/
  shared/src/index.ts  Upload limits, MIME types, pagination caps (@diuqbank/shared)
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
- **Files:** R2 binding `BUCKET` for writes; objects are served publicly from
  the bucket's custom domain `https://r2.diuqbank.com/<key>` (see `fileUrlFor`
  in `src/lib/user-shape.ts`) — the Worker does not proxy files. Uploads are
  magic-byte validated.

## Production Safety

This site is **live in production** (web: diuqbank.com, api: api.diuqbank.com,
files: r2.diuqbank.com). Never delete or wipe data in the remote D1 database or
the R2 bucket. Destructive commands (`wrangler d1 execute --remote` with
DELETE/DROP, bucket deletions) require explicit human sign-off; migrations that
drop tables/columns need the owner's approval.

## Web Conventions (`apps/web`)

- **API types:** generated into `src/types/openapi.ts` **from local API
  source** via `pnpm --filter diuqbank-web run api:types` (it runs the API's
  `openapi:emit` script, then openapi-typescript on `apps/api/openapi.json`).
  No deploy needed; regenerate in the same commit as the API contract change.
  `api:types:remote` still reads the deployed spec for comparison.
- **Contract check:** `src/types/contract-check.ts` type-asserts the generated
  schemas against the API's DTO types (type-only import of
  `diuqbank-api/shared/types`). If typecheck fails there, a response schema in
  `apps/api/src/openapi.ts` drifted from `apps/api/src/shared/types.ts`; fix
  whichever side is wrong and rerun `api:types`. Add an assertion when adding
  a new response DTO.
- **API base:** same-origin `/api` by default; the Vite dev server proxies it
  to the deployed API (`VITE_DEV_API_PROXY_TARGET` overrides the target;
  `VITE_API_BASE_URL` overrides the base at build time).
- **Lint:** oxlint (not eslint).

## Gotchas

- Verify before declaring done: `pnpm typecheck && pnpm lint` (from the root).
- Secrets (`JWT_SECRET`, `ADMIN_EMAIL`, `PDF_PROCESSOR_API_KEY`) are Worker
  secrets; do not commit them. Local dev uses `apps/api/.dev.vars`.
- Do not install `@cloudflare/workers-types`; `wrangler types` generates
  `apps/api/worker-configuration.d.ts`.
- Migrations are applied via `wrangler d1 migrations apply`, not the Drizzle
  client.
