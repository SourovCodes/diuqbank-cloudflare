# DIU Question Bank — agent guide

Onboarding notes for AI coding agents (Claude Code, Codex, etc.). See [README.md](README.md)
for the human-facing overview. App-specific rules live in `apps/api/AGENTS.md` and
`apps/web/AGENTS.md` — your tool reads the **nearest** one, so the file beside the code you
touch is the source of truth for that app.

## What this is

A **pnpm workspace monorepo** for the DIU Question Bank — two independently deployable
Cloudflare Workers plus shared packages.

```
apps/
  api/              Hono API on Cloudflare Workers (D1 + Drizzle, R2, JWT) — used by the Android app & the web app
  web/              Next.js 16 App Router site, deployed via OpenNext to Workers
packages/
  api-client/       OpenAPI types + shared API client, generated from the API
  config/           Shared TypeScript + ESLint config
```

Package manager: **pnpm 10.33.2** (pinned via `packageManager`). Run `pnpm install` once.

## How the apps fit together

- The website calls the API. **Two paths, on purpose:**
  - **SSR (server):** Next.js → API over the `API` Cloudflare **service binding**
    (`apps/web/src/lib/api/server.ts`) — used for public pages.
  - **Client-direct (browser → API):** auth, profile, and the admin panel call the API
    directly with a `Bearer` JWT (`apps/web/src/lib/api/client.ts`). These deliberately
    skip the SSR proxy.
- Browser-facing **file URLs** (PDFs, profile images) use the API's public origin; the API
  streams them from R2 at `GET /files/:key`.
- The **Android app** uses the public API Worker directly — the API and web are separate
  Workers so that contract stays stable.
- The API/web contract is shared as generated types in `packages/api-client`. **After
  changing the API surface, run `pnpm api:generate`** to regenerate them.

## Common commands (run from the repo root)

```bash
pnpm dev            # API + web together
pnpm dev:api        # API only (wrangler dev — picks 8787, or 8788 if taken)
pnpm dev:web        # web only (next dev)

pnpm typecheck      # tsc across all workspaces
pnpm lint           # eslint across all workspaces
pnpm build          # build all (next build + opennextjs build)

pnpm api:generate   # regenerate OpenAPI schema + api-client types (after API changes)

pnpm deploy:api     # deploy the API Worker
pnpm deploy:web     # deploy the web Worker
```

Target one workspace with `pnpm --filter @diuqbank/api <script>` /
`pnpm --filter @diuqbank/web <script>`.

## Conventions & gotchas

- **Verify before declaring done:** `pnpm typecheck && pnpm lint` (and `pnpm build` for
  build-affecting changes). There is no test runner configured yet.
- **Deploy order:** when the API contract changes, deploy the API **before** the web Worker.
- **Secrets** (`JWT_SECRET`) are API Worker secrets — never committed; set with
  `pnpm --filter @diuqbank/api exec wrangler secret put JWT_SECRET`. Local dev uses
  `apps/api/.dev.vars`.
- **Auth is Google OAuth only** (no passwords). Sign-in is a Google ID token → API
  `POST /auth/google` → app JWT (HS256, 7-day) stored in `localStorage`.
