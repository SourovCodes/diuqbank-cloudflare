import type { Context } from "hono";

/**
 * Cache headers for endpoints whose response is the same for everyone.
 * Safe to cache at the edge and in shared caches.
 */
export const setPublicCacheHeaders = (c: Context, maxAgeSeconds: number) => {
  c.header("Cache-Control", `public, max-age=${maxAgeSeconds}`);
};

/**
 * Cache headers for per-user responses: cache only in the requester's own
 * browser, never in any shared cache.
 */
export const setPrivateCacheHeaders = (c: Context, maxAgeSeconds: number) => {
  c.header("Cache-Control", `private, max-age=${maxAgeSeconds}`);
};
