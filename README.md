# DIU Question Bank

A pnpm-workspace monorepo for the DIU Question Bank, deployed entirely on Cloudflare.

## Packages

| Package                          | What it is                                              | Deploys as                          |
| -------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| [`apps/api/`](apps/api)          | Hono API on Cloudflare Workers (D1, R2, JWT auth)       | Worker `diuqbank`                   |
| [`apps/web/`](apps/web)          | Vite + React 19 SPA (React Router, TanStack Query)      | Workers static assets `diuqbank-web`|
| `packages/shared/`               | `@diuqbank/shared`: response types, Zod schemas, utils  | (consumed by both — not deployed)   |

`packages/shared/` is the single source of truth for the API↔web contract: the web imports the response
DTO types and reuses the API's Zod request schemas; the API's response-shape helpers are annotated
to return those same DTO types, so a `tsc` run fails if the served shape drifts from the contract.

## Getting started

```bash
pnpm install          # one lockfile for the whole workspace

pnpm dev:api          # the API   — wrangler dev on http://localhost:8787
pnpm dev:web          # the web   — vite dev server
```

For local web→API development, point the SPA at the local API:

```bash
cp apps/web/.env.example apps/web/.env.local   # sets VITE_API_URL=http://localhost:8787
```

When `VITE_API_URL` is unset the web falls back to the deployed API Worker.

## Verify

```bash
pnpm typecheck        # tsc --noEmit across api, web, shared
pnpm lint             # eslint (api)
pnpm build            # production build (web)
```

## Deploy

```bash
pnpm deploy:api       # wrangler deploy --minify        (the API Worker)
pnpm deploy:web       # vite build && wrangler deploy   (the static-assets Worker)
```

The API requires Worker secrets (`JWT_SECRET`, `ADMIN_EMAIL`, …) — see [apps/api/README.md](apps/api/README.md).
The web needs no secrets; its only config is the public `VITE_API_URL` baked in at build time.
