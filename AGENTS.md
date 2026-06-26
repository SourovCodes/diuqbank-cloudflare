# DIU Question Bank — monorepo agent guide

Onboarding notes for AI coding agents (Claude Code, Codex, etc.). See [README.md](README.md)
for the human-facing overview.

## What this is

A **pnpm-workspace monorepo** with three packages, all deployed to Cloudflare:

- **`api/`** — a Hono API on Cloudflare **Workers**: D1 + Drizzle, R2 for files, stateless JWT
  auth, hand-written OpenAPI. Worker name `diuqbank`. Mirrors the production reference repo
  `github.com/SourovCodes/diuqbank-backend-api`.
- **`web/`** — a Vite + React 19 SPA (React Router 7, TanStack Query, Tailwind 4) deployed as a
  Cloudflare **Workers static-assets** site (worker name `diuqbank-web`, SPA fallback). Calls the
  API over `fetch`; base URL from `import.meta.env.VITE_API_URL` (defaults to the deployed Worker).
- **`shared/`** — `@diuqbank/shared`: the API↔web contract. Response DTO **types**
  (`shared/src/types.ts`), Zod request **schemas** (`shared/src/schemas/**`), and pure **utils**
  (`pagination`, `question-title`). Ships raw TS (no build); both bundlers transpile it. The API's
  shape helpers are annotated to return these DTO types, so `tsc` fails on contract drift.

Package manager: **pnpm 10.33.2** (pinned at the root `packageManager`). Run `pnpm install` once
at the repo root. The detailed API conventions below describe files **under `api/`**.

## Layout

```
api/
  src/
    index.ts             App entry: builds Hono<AppEnv>, mounts routes, global onError, CORS
    types.ts             AppEnv / Bindings (DB, BUCKET, GOOGLE_CLIENT_ID, JWT_SECRET…)
    openapi.ts           Hand-written OpenAPI 3 doc (imports Zod schemas from @diuqbank/shared)
    db/
      schema.ts          Drizzle schema — source of truth for the DB (tables + relations)
      client.ts          getDb(c.env.DB)
    middleware/auth.ts   requireAuth (sets c.var.user) / requireAdmin
    routes/              One file per domain: auth, questions, contributors, filter-options, files
      admin/             One file per admin resource + index.ts (auth applied once)
    lib/                 validator, jwt, google-oauth, image-upload, pdf-upload, parse-id,
                         user-shape, admin-shape (pagination + question-title now in shared/)
  drizzle/               Generated SQL migrations (applied via wrangler, not the Drizzle client)
  wrangler.jsonc         Worker config: D1 binding DB, R2 binding BUCKET, vars, etc.
web/
  src/                   React SPA; lib/api.ts is the API client (imports types from @diuqbank/shared)
  wrangler.jsonc         Static-assets Worker (assets dir ./dist, SPA not_found_handling)
shared/
  src/types.ts           Canonical response DTOs (single source of truth)
  src/schemas/           Zod request schemas (admin/ mirrors api routes/admin/)
  src/utils/             pagination (pageFields, buildMeta), question-title (buildQuestionTitle)
```

**Imports from shared:** types via `@diuqbank/shared/types`, schemas via
`@diuqbank/shared/schemas/<name>` (e.g. `.../schemas/admin/courses`), utils via
`@diuqbank/shared/utils/pagination`. The barrel `@diuqbank/shared` re-exports types + utils.

## Conventions

- **Routing:** plain `Hono<AppEnv>` (no `@hono/zod-openapi`). Validate with
  `validate(target, schema)` from `src/lib/validator.ts` (wraps `@hono/zod-validator`,
  returns `400 { error, issues[] }`). One file per route domain.
- **OpenAPI is hand-written** in `src/openapi.ts` (request schemas via Zod 4
  `z.toJSONSchema()`); served with Scalar via CDN at `/docs`, spec at `/openapi.json`.
  Update it when you add/change endpoints.
- **DB:** Drizzle + D1. `schema.ts` is the source of truth. **Timestamps are Unix epoch
  seconds** (integer `unixepoch()`, returned as numbers). `submissionCount` on `users`/
  `questions` is maintained by SQLite triggers on `submissions` insert/delete/update (see
  `drizzle/0003_submission_count_triggers.sql`) — never write it from app code; read
  endpoints select the stored column.
- **Errors:** throw `HTTPException`; the global `onError` in `index.ts` maps D1 constraint
  failures (UNIQUE → 409 "<col> already exists", FK → 400, NOT NULL → 400).
- **Delete-safety:** admin DELETEs pre-count dependents and return **409 with a count**
  instead of a misleading FK-400.
- **Auth:** Google OAuth only (no passwords). `POST /auth/google` verifies the Google ID token
  (`src/lib/google-oauth.ts`: checks `aud == GOOGLE_CLIENT_ID`, `email_verified`, `exp`),
  find-or-creates by email, returns a JWT. JWT is HS256, 7-day, payload `{ sub, username,
  role }` stored client-side. **`hono/jwt` `verify` needs the alg as the 3rd arg:**
  `verify(t, secret, "HS256")`. Role is baked into the JWT — promoting a user requires them to
  re-auth. `GET /auth/config` (public) returns `{ googleClientId }` to bootstrap sign-in.
- **Files:** R2 binding `BUCKET`. The Worker serves objects itself at `GET /files/:key{.+}`
  (immutable cache); there is no public bucket. Uploads are magic-byte validated
  (`image-upload.ts` for images ≤5MB, `pdf-upload.ts` `%PDF` ≤20MB).

## Common commands

```bash
# From the repo root (workspace-wide):
pnpm install             # install all packages (one lockfile)
pnpm dev:api             # wrangler dev (port 8787) — the API
pnpm dev:web             # vite dev server — the web SPA
pnpm typecheck           # tsc --noEmit across api, web, shared
pnpm lint                # eslint (api)
pnpm build               # production build (web)
pnpm deploy:api          # wrangler deploy --minify (the API Worker)
pnpm deploy:web          # vite build && wrangler deploy (the static-assets Worker)

# API-only tasks — run from api/ (or `pnpm --filter @diuqbank/api <script>`):
pnpm db:generate         # generate a Drizzle migration after editing schema.ts
pnpm db:migrate:local    # apply migrations to local D1
pnpm db:migrate:remote   # apply migrations to remote D1
pnpm cf-typegen          # regenerate worker-configuration.d.ts after wrangler.jsonc changes
```

For local web→API dev, set `VITE_API_URL=http://localhost:8787` (see `web/.env.example`).

## Gotchas

- **Verify before declaring done:** `pnpm typecheck && pnpm lint`. There is no test runner
  configured yet.
- **Secrets** (`JWT_SECRET`, `ADMIN_EMAIL`) are Worker secrets — never committed; set with
  `pnpm exec wrangler secret put <NAME>`. Local dev uses `.dev.vars`. `ADMIN_EMAIL` decides
  which newly created Google account receives the admin role.
- **Do not** install `@cloudflare/workers-types` — `wrangler types` already generates
  `worker-configuration.d.ts`; both together create duplicate globals.
- Migrations are applied via `wrangler d1 migrations apply`, **not** the Drizzle client.
- `scripts/import.ts` (`db:import:*`) DESTRUCTIVELY wipes + reseeds D1 from prod data;
  `:remote` nukes real prod data — only run intentionally.
