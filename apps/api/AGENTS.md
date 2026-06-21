# apps/api — agent guide

Hono API on **Cloudflare Workers**: D1 + Drizzle, R2 for files, stateless JWT auth,
hand-written OpenAPI. Read the root [AGENTS.md](../../AGENTS.md) first for the monorepo
picture and shared commands. This pattern mirrors the production reference repo
`github.com/SourovCodes/diuqbank-backend-api`.

## Layout

```
src/
  index.ts             App entry: builds Hono<AppEnv>, mounts routes, global onError
  types.ts             AppEnv / Bindings (DB, BUCKET, GOOGLE_CLIENT_ID, JWT_SECRET, API_PUBLIC_ORIGIN…)
  openapi.ts           Hand-written OpenAPI 3 doc (NOT generated from code)
  db/
    schema.ts          Drizzle schema — source of truth for the DB (7 tables + relations)
    client.ts          getDb(c.env.DB)
  middleware/auth.ts   requireAuth (sets c.var.user) / requireAdmin
  routes/              One file per domain: auth, questions, contributors, filter-options, files
    admin/             One file per admin resource + index.ts (auth applied once)
  schemas/             Zod request schemas (admin/ mirrors routes/admin/)
  lib/                 validator, jwt, google-oauth, image-upload, pdf-upload, pagination,
                       parse-id, question-title, user-shape, admin-shape
drizzle/               Generated SQL migrations (applied via wrangler, not the Drizzle client)
wrangler.jsonc         Worker config: D1 binding DB, R2 binding BUCKET, vars, etc.
```

## Conventions

- **Routing:** plain `Hono<AppEnv>` (no `@hono/zod-openapi`). Validate with
  `validate(target, schema)` from `src/lib/validator.ts` (wraps `@hono/zod-validator`,
  returns `400 { error, issues[] }`). One file per route domain.
- **OpenAPI is hand-written** in `src/openapi.ts` (request schemas via Zod 4
  `z.toJSONSchema()`); served with Scalar via CDN at `/docs`, spec at `/openapi.json`.
  Update it when you add/change endpoints — then run `pnpm api:generate` from the root to
  refresh `packages/api-client`.
- **DB:** Drizzle + D1. `schema.ts` is the source of truth. **Timestamps are Unix epoch
  seconds** (integer `unixepoch()`, returned as numbers). `submissionCount` columns are
  not trigger-maintained yet, so read endpoints compute counts dynamically.
- **Errors:** throw `HTTPException`; the global `onError` in `index.ts` maps D1 constraint
  failures (UNIQUE → 409 "<col> already exists", FK → 400, NOT NULL → 400).
- **Delete-safety:** admin DELETEs pre-count dependents and return **409 with a count**
  instead of a misleading FK-400.
- **Auth:** Google OAuth only. `POST /auth/google` verifies the Google ID token
  (`src/lib/google-oauth.ts`: checks `aud == GOOGLE_CLIENT_ID`, `email_verified`, `exp`),
  find-or-creates by email, returns a JWT. JWT is HS256, 7-day, payload `{ sub, username,
  role }`. **`hono/jwt` `verify` needs the alg as the 3rd arg:** `verify(t, secret, "HS256")`.
  Role is baked into the JWT — promoting a user requires them to re-auth.
  `GET /auth/config` (public) returns `{ googleClientId }` to bootstrap web sign-in.
- **Files:** R2 binding `BUCKET`. The Worker serves objects itself at `GET /files/:key{.+}`
  (immutable cache); there is no public bucket. Uploads are magic-byte validated
  (`image-upload.ts` for images ≤5MB, `pdf-upload.ts` `%PDF` ≤20MB).

## Commands (from repo root, or `pnpm --filter @diuqbank/api <script>`)

```bash
pnpm dev:api                                  # wrangler dev (port 8787/8788)
pnpm --filter @diuqbank/api db:generate       # generate Drizzle migration after editing schema.ts
pnpm --filter @diuqbank/api db:migrate:local  # apply migrations to local D1
pnpm --filter @diuqbank/api db:migrate:remote # apply migrations to remote D1
pnpm --filter @diuqbank/api cf-typegen        # regenerate worker-configuration.d.ts after wrangler.jsonc changes
pnpm deploy:api                               # wrangler deploy --minify
```

## Gotchas

- **Do not** install `@cloudflare/workers-types` — `wrangler types` already generates
  `worker-configuration.d.ts`; both together create duplicate globals.
- Migrations are applied via `wrangler d1 migrations apply`, **not** the Drizzle client.
- `scripts/import.ts` (`db:import:*`) DESTRUCTIVELY wipes + reseeds D1 from prod data;
  `:remote` nukes real prod data — only run intentionally.
