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

Generated API types live in `src/types/openapi.ts` and are sourced from:

```sh
https://diuqbank-api-prod.sourov-cse.workers.dev/openapi.json
```

Local development uses a same-origin `/api` path by default. Vite proxies that path to the production API so local requests do not depend on browser CORS behavior.

Optional environment variables:

```sh
VITE_API_BASE_URL=/api
VITE_DEV_API_PROXY_TARGET=https://diuqbank-api-prod.sourov-cse.workers.dev
```

For a production build that should call a different API origin, set `VITE_API_BASE_URL` before running `npm run build`.

## Development

```sh
npm install
npm run dev
```

The dev server is pinned to port `5173` with `strictPort` enabled.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
npm run deploy:dry-run
```

Refresh generated OpenAPI types after backend contract changes:

```sh
npm run api:types
```

## Deploy

```sh
npm run deploy
```

Wrangler serves `dist` as static assets and uses SPA fallback handling for deep links such as `/questions/71`.
