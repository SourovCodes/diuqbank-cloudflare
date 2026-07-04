# DIUQBank Web

React/Vite frontend for the public DIU QuestionBank archive. The app is built as static assets and deployed with Cloudflare Wrangler.

## Stack

- React 19
- React Router 7
- TanStack Query 5
- Tailwind CSS 4
- Vite 8
- Wrangler static assets

## API

Generated API types live in `src/types/openapi.ts` and are generated from the
local API source (`apps/api/src/openapi.ts`) — no deploy needed:

```sh
pnpm run api:types          # emit apps/api/openapi.json from source, then generate types
pnpm run api:types:remote   # generate from the deployed /openapi.json instead
```

Shared constants (upload limits, MIME types) come from the workspace package
`@diuqbank/shared`.

Local development uses a same-origin `/api` path by default. Vite proxies that path to the production API so local requests do not depend on browser CORS behavior.

Optional environment variables:

```sh
VITE_API_BASE_URL=/api
VITE_DEV_API_PROXY_TARGET=https://diuqbank-api-prod.sourov-cse.workers.dev
```

For a production build that should call a different API origin, set `VITE_API_BASE_URL` before running `pnpm run build`.

## Development

```sh
pnpm install
pnpm run dev
```

The dev server is pinned to port `5173` with `strictPort` enabled.

## Verification

```sh
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run deploy:dry-run
```

Refresh generated OpenAPI types after backend contract changes:

```sh
pnpm run api:types
```

## Deploy

```sh
pnpm run deploy
```

Wrangler serves `dist` as static assets and uses SPA fallback handling for deep links such as `/questions/71`.
