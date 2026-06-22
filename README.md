# DIU Question Bank

pnpm monorepo containing two independently deployable Cloudflare Workers:

- `apps/api` — the existing Hono API used by Android and future web clients.
- `apps/web` — the Next.js App Router website deployed with OpenNext.
- `packages/api-client` — generated OpenAPI types and the shared API client.
- `packages/config` — shared TypeScript and ESLint configuration.

The website calls the API Worker through the `API` Service Binding during SSR.
Browser-facing file URLs still use the API's public origin. The Android app keeps
using the existing public API Worker directly.

## Development

```bash
pnpm install
pnpm dev       # API and web together
pnpm dev:api   # API only
pnpm dev:web   # web only
pnpm api:generate # regenerate the API schema and client types
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

Deploy the API before the web Worker when the API contract changes. Runtime
secrets such as `JWT_SECRET` and `ADMIN_EMAIL` remain API Worker secrets and are
not shared with the web app or committed to the repository. `ADMIN_EMAIL`
determines which newly created Google account receives the admin role:

```bash
pnpm --filter @diuqbank/api exec wrangler secret put JWT_SECRET
pnpm --filter @diuqbank/api exec wrangler secret put ADMIN_EMAIL
```

For local development, add both values to `apps/api/.dev.vars`.

The API and website remain separate Workers, so the Android API deployment and
contract are preserved.
