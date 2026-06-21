<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- Everything below is hand-maintained; the block above is tool-managed — keep them separate. -->

# apps/web — agent guide

The DIU Question Bank frontend: **Next.js 16.2.9 (Turbopack, App Router)**, React 19,
Tailwind 4 + shadcn/ui, deployed to Cloudflare via **OpenNext**. See the root
[AGENTS.md](../../AGENTS.md) for the monorepo and shared commands.

## React Compiler ESLint rules (the most common way to get blocked)

The ESLint config enforces React Compiler-era rules that reject patterns you may reach for
by habit:

- **`react-hooks/set-state-in-effect`** — no *synchronous* `setState` in an effect body.
  `setState` inside `.then/.catch/.finally` or other async callbacks is fine; for a
  synchronous need use `queueMicrotask(() => setState(...))` (the pattern
  `src/components/auth-provider.tsx` already uses).
- **`react-hooks/refs`** — don't write `ref.current = x` during render; assign inside an effect.
- **Resetting a dialog form on open:** don't use a reset effect. Mount the form fresh each
  open — `components/admin/form-dialog.tsx` (`FormDialog`) wraps a Radix `Dialog` whose
  content unmounts on close, so an inner `*Form` that seeds `useState` from props
  re-initializes every open.

## Talking to the API — two paths, on purpose

- **Client-direct (browser → API):** `src/lib/api/client.ts` exports `request` /
  `bearerHeaders` / `API_ORIGIN` (+ `ApiError`). `useAuth()`
  (`src/components/auth-provider.tsx`) exposes `{ user, token, ... }`; `token` is the JWT
  in `localStorage` (`diuqbank.auth.token`) used for admin/profile `Authorization: Bearer`.
- **Server (SSR):** `src/lib/api/server.ts` uses the Cloudflare `API` **service binding**
  (`env.API.fetch`) for public pages. Admin/profile deliberately avoid this proxy.

## Auth & Google One Tap

`src/components/auth-provider.tsx` owns sign-in: loads the GSI script, calls
`google.accounts.id.initialize` (FedCM, `hd: diu.edu.bd`) + One Tap `prompt()`, and renders
the "Continue with Google" button on `/sign-in`. Google dismissal of the FedCM One Tap
prompt makes GSI log a benign `AbortError`; it is filtered out in
`src/lib/silence-gsi-noise.ts` (called once from the auth provider) so it doesn't trip the
Next.js dev error overlay. Don't reintroduce that log by removing the filter.

## Admin panel

`/admin` is client-rendered and role-guarded once in `app/admin/layout.tsx`. Full CRUD for
the 7 admin resources, one `page.tsx` each under `app/admin/<resource>/`. Typed wrapper in
`lib/api/admin-client.ts`. Shared building blocks in `components/admin/`: `useAdminList`,
`useAdminQueryState` (URL page/search/filter state + `CustomPagination`), `AdminToolbar`
(debounced search → URL), `DeleteConfirm` (surfaces API 409 messages verbatim),
`useFilterOptions`, `useSubmissionLookups`. FK pickers use `NativeSelect`. The header shows
the **Admin** link only when `user.role === "admin"`.

## Verify

`pnpm typecheck` (runs `next typegen` first) and `pnpm lint`. `pnpm --filter @diuqbank/web
preview` builds + serves as a Worker via OpenNext.
