# DIU Question Bank API

A single, independently deployable Cloudflare Worker — the Hono API used by the Android app and
future web clients. D1 + Drizzle for data, R2 for files, stateless Google-OAuth JWT auth, and a
hand-written OpenAPI spec served with Scalar at `/docs`.

## Development

```bash
pnpm install
pnpm dev          # wrangler dev (port 8787, or 8788 if taken)
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

Runtime secrets such as `JWT_SECRET` and `ADMIN_EMAIL` are Worker secrets — not committed.
`ADMIN_EMAIL` determines which newly created Google account receives the admin role:

```bash
pnpm exec wrangler secret put JWT_SECRET
pnpm exec wrangler secret put ADMIN_EMAIL
```

For local development, add both values to `.dev.vars`.

## Database

```bash
pnpm db:generate        # generate a Drizzle migration after editing src/db/schema.ts
pnpm db:migrate:local   # apply migrations to local D1
pnpm db:migrate:remote  # apply migrations to remote D1
```
