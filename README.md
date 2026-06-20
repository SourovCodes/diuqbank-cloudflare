# DIU Question Bank

pnpm monorepo containing two independently deployable Cloudflare Workers:

- `apps/api` — the existing Hono API used by Android and future web clients.
- `apps/web` — a default Next.js App Router site deployed with OpenNext.

## Development

```bash
pnpm install
pnpm dev       # API and web together
pnpm dev:api   # API only
pnpm dev:web   # web only
```

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Deployment

```bash
pnpm deploy:api
pnpm deploy:web
```

The API and website remain separate Workers, so the Android API deployment and contract are preserved.
