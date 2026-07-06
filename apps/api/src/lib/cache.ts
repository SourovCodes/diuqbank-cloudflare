import type { Context } from "hono";

import type { AppEnv } from "../types";

type Env = AppEnv["Bindings"];

// Backstop expiry. Real invalidation is done by bumping version tokens (below);
// the TTL only refreshes entries during long write-free periods and reaps any
// keys orphaned by a bump.
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Read-or-compute a cached JSON response.
 *
 * `versions` are the version-token names this response depends on (see the
 * `invalidate*` helpers for what each token covers). They are folded into the
 * cache key, so bumping any of them makes existing entries unreachable. `key`
 * must be unique per response variant (path + normalized params; include the
 * user id for per-user endpoints). `produce` returns the plain object that would
 * be passed to `c.json()`. Throwing inside `produce` (e.g. a 404 HTTPException)
 * bypasses caching and propagates to the global onError.
 */
export const withCache = async <T>(
  c: Context<AppEnv>,
  opts: { versions: string[]; key: string; ttl?: number },
  produce: () => Promise<T>,
): Promise<Response> => {
  const tokens = await Promise.all(
    opts.versions.map((name) => c.env.CACHE.get(`v:${name}`, { cacheTtl: 60 })),
  );
  const version = tokens.map((t) => t ?? "0").join(".");
  // File URLs in responses point at the fixed R2 public domain (see
  // `fileUrlFor`), so responses no longer vary by request origin.
  const fullKey = `${version}:${opts.key}`;

  const hit = await c.env.CACHE.get<T>(fullKey, "json");
  if (hit !== null) {
    c.header("X-Cache", "HIT");
    return c.json(hit);
  }

  const data = await produce();
  // Don't make the client wait on the cache write.
  c.executionCtx.waitUntil(
    c.env.CACHE.put(fullKey, JSON.stringify(data), {
      expirationTtl: opts.ttl ?? DEFAULT_TTL,
    }),
  );
  c.header("X-Cache", "MISS");
  return c.json(data);
};

/**
 * Replace each named version token with a fresh value, making every cache key
 * that depends on it unreachable. A random value (not a counter) means
 * concurrent bumps never race — we only need the token to change.
 *
 * Propagation is not instantaneous: `withCache` reads version tokens with
 * `cacheTtl: 60`, so a bump can take up to ~60s to be seen at an edge PoP that
 * recently cached the old token. Mutations return the fresh entity in their own
 * response, so the writer sees their change immediately; only cross-PoP reads
 * lag, and by at most that window.
 */
export const bumpCache = (env: Env, ...names: string[]): Promise<unknown> =>
  Promise.all(names.map((name) => env.CACHE.put(`v:${name}`, crypto.randomUUID())));

// ---------------------------------------------------------------------------
// Invalidation matrix — the single source of truth for which cached responses a
// given write affects. Callers pass the ids/usernames they already have in hand.
//
// Tokens: `tax` (taxonomy), `q:list` (questions list), `q:<id>` (a question's
// detail + its submissions), `c:list` (contributors list), `c:<username>` (a
// contributor's detail + their submissions), `user:<id>` (that user's /auth/me).
// ---------------------------------------------------------------------------

/** Any taxonomy write (dept/course/semester/exam-type): titles + filter options. */
export const invalidateTaxonomy = (env: Env): Promise<unknown> =>
  bumpCache(env, "tax", "q:list");

/** A new question: only the list changes (no detail cache exists yet). */
export const invalidateQuestionCreate = (env: Env): Promise<unknown> =>
  bumpCache(env, "q:list");

/** A question edited or deleted: its detail/submissions and the list. */
export const invalidateQuestion = (env: Env, id: number): Promise<unknown> =>
  bumpCache(env, `q:${id}`, "q:list");

/** A submission added or removed: counts change (both lists) + the question + the contributor. */
export const invalidateSubmission = (
  env: Env,
  questionId: number,
  username: string,
): Promise<unknown> =>
  bumpCache(env, `q:${questionId}`, "q:list", "c:list", `c:${username}`);

/** A submission edited / PDF replaced / watermarked: no count change. */
export const invalidateSubmissionEdit = (
  env: Env,
  questionId: number,
  username: string,
): Promise<unknown> => bumpCache(env, `q:${questionId}`, `c:${username}`);

/**
 * A submission's view count bumped: its question (detail + list, whose summed
 * viewCount changed) and the contributor's submissions page. No user-level count
 * changes, so the contributor list (`c:list`) is untouched.
 */
export const invalidateSubmissionView = (
  env: Env,
  questionId: number,
  username: string,
): Promise<unknown> =>
  bumpCache(env, `q:${questionId}`, "q:list", `c:${username}`);

/** A submission moved to another question or contributor: old + new lists/counts changed. */
export const invalidateSubmissionMove = (
  env: Env,
  from: { questionId: number; username: string },
  to: { questionId: number; username: string },
): Promise<unknown> =>
  bumpCache(
    env,
    ...new Set([
      `q:${from.questionId}`,
      `q:${to.questionId}`,
      "q:list",
      "c:list",
      `c:${from.username}`,
      `c:${to.username}`,
    ]),
  );

/** A user's profile edited (own or by admin): /auth/me + their contributor pages + the list. */
export const invalidateUser = (
  env: Env,
  id: number,
  username: string,
): Promise<unknown> =>
  bumpCache(env, `user:${id}`, `c:${username}`, "c:list");
