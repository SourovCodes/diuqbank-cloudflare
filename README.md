# DIU Question Bank

pnpm workspace monorepo for DIU Question Bank — a public archive of DIU exam
question papers, deployed entirely on Cloudflare.

## Apps

| App | Path | What it is |
| --- | --- | --- |
| `diuqbank-api` | [apps/api](apps/api) | Hono API on Cloudflare Workers (D1 + Drizzle, R2, PDF queue). Worker: `diuqbank-api-prod`. |
| `diuqbank-web` | [apps/web](apps/web) | React 19 + Vite frontend, deployed as a Wrangler assets-only Worker. Worker: `diuqbank-web-prod`. |

Each app has its own README with details.

## Development

Requires Node and pnpm (version pinned via `packageManager` in `package.json`).

```bash
pnpm install       # install everything, once, from the root
pnpm dev           # run api + web dev servers in parallel
pnpm dev:api       # wrangler dev (port 8787)
pnpm dev:web       # vite dev server (port 5173)
```

## Verification

```bash
pnpm typecheck     # tsc --noEmit in every app
pnpm lint          # eslint (api) + oxlint (web)
pnpm build         # production build (web)
```

## Deployment

```bash
pnpm deploy:api
pnpm deploy:web
```

## Database (D1)

```bash
pnpm db:generate        # generate a Drizzle migration
pnpm db:migrate:local   # apply migrations to local D1
pnpm db:migrate:remote  # apply migrations to remote D1
```

## Conventions

- One lockfile (`pnpm-lock.yaml`) at the root; apps never have their own.
- Run any app script from the root with `pnpm --filter <app> run <script>`.
- Root scripts are thin `--filter` wrappers; app-specific behavior lives in the
  app's own `package.json`.
