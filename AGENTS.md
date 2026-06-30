# DIU Question Bank API — Agent Guide

Onboarding notes for AI coding agents. See [README.md](README.md) for the
human-facing overview.

## What This Is

A single Cloudflare Worker API:

- Hono API on Cloudflare Workers: D1 + Drizzle, R2 for files, stateless JWT auth,
  hand-written OpenAPI, and a throttled PDF processing queue.
- Worker name: `diuqbank-api-prod`.
- `src/shared/` contains local API DTO types, Zod request schemas, constants, and
  pure helpers that used to live in the old shared package.

Package manager: **pnpm 10.33.2** (pinned in `package.json`).

## Layout

```text
src/
  index.ts             App entry: builds Hono<AppEnv>, mounts routes, global onError, CORS
  types.ts             AppEnv / Bindings (DB, BUCKET, GOOGLE_CLIENT_ID, JWT_SECRET...)
  openapi.ts           Hand-written OpenAPI 3 doc
  queue.ts             PDF queue consumer
  db/
    schema.ts          Drizzle schema, source of truth for DB tables + relations
    client.ts          getDb(c.env.DB)
  middleware/
    auth.ts            requireAuth / requireAdmin
    rate-limit.ts      Cloudflare native rate-limit wrapper
  routes/              One file per route domain
    admin/             Admin resources; auth applied once in index.ts
  lib/                 JWT, upload validation, shape helpers, taxonomy, PDF helpers
  shared/
    types.ts           Canonical response DTOs
    schemas/           Zod request schemas
    utils/             pagination and question-title helpers
drizzle/               Generated SQL migrations, applied by Wrangler
wrangler.jsonc         Worker config: D1, R2, queues, rate limits, vars, secrets
```

## Conventions

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

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm deploy

pnpm db:generate
pnpm db:migrate:local
pnpm db:migrate:remote
pnpm cf-typegen
```

## Gotchas

- Verify before declaring done: `pnpm typecheck && pnpm lint`.
- Secrets (`JWT_SECRET`, `ADMIN_EMAIL`, `PDF_PROCESSOR_API_KEY`,
  `GEMINI_API_KEY`) are Worker secrets; do not commit them. Local dev uses
  `.dev.vars`.
- Do not install `@cloudflare/workers-types`; `wrangler types` generates
  `worker-configuration.d.ts`.
- Migrations are applied via `wrangler d1 migrations apply`, not the Drizzle
  client.
