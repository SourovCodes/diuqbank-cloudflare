# DIU Question Bank API

A single Cloudflare Worker API for DIU Question Bank. It uses Hono, D1 + Drizzle,
R2 for files, stateless Google-OAuth JWT auth, a throttled PDF queue, and a
hand-written OpenAPI spec served with Scalar at `/docs`.

## Development

```bash
pnpm install
pnpm dev          # wrangler dev
```

## Verification

```bash
pnpm typecheck
pnpm lint
```

## Deployment

```bash
pnpm deploy       # wrangler deploy --minify
```

Runtime secrets such as `JWT_SECRET`, `ADMIN_EMAIL`, `PDF_PROCESSOR_API_KEY`,
and `GEMINI_API_KEY` are Worker secrets and are not committed:

```bash
pnpm exec wrangler secret put JWT_SECRET
pnpm exec wrangler secret put ADMIN_EMAIL
pnpm exec wrangler secret put PDF_PROCESSOR_API_KEY
pnpm exec wrangler secret put GEMINI_API_KEY
```

For local development, add those values to `.dev.vars`.

## Database

```bash
pnpm db:generate        # generate a Drizzle migration after editing src/db/schema.ts
pnpm db:migrate:local   # apply migrations to local D1
pnpm db:migrate:remote  # apply migrations to remote D1
```

Migrations are applied with Wrangler, not the Drizzle client.
