import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";

import type { AppEnv } from "../types";

/**
 * Enforce a Cloudflare rate-limit binding for `key`, throwing `429` when the
 * caller has exhausted the window. The limits are configured in wrangler.jsonc
 * (`unsafe.bindings`, type `ratelimit`); they are colo-local, so they bound how
 * fast a single user/IP can hammer an endpoint rather than acting as a global
 * quota. That is exactly what we want here: keep one caller from flooding the
 * shared PDF queue, the paid Gemini path, or the login endpoint.
 */
export const enforceRateLimit = async (
  limiter: RateLimit,
  key: string,
): Promise<void> => {
  const { success } = await limiter.limit({ key });
  if (!success) {
    throw new HTTPException(429, {
      message: "Too many requests — please slow down and try again shortly.",
    });
  }
};

/**
 * Best-effort client IP for per-IP limits on unauthenticated endpoints. Cloudflare
 * always sets `CF-Connecting-IP` in production; falls back to a shared bucket in
 * local dev (where the header is absent) so the limiter still functions.
 */
export const clientIp = (c: Context<AppEnv>): string =>
  c.req.header("cf-connecting-ip") ?? "local-dev";
