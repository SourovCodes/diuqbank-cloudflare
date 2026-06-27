import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

import type { AppEnv, Bindings } from "../types";

/**
 * The key a request is bucketed under. Authenticated requests are limited per
 * user id (so one user can't dodge limits by rotating IPs, and shared NATs
 * don't punish each other); anonymous requests fall back to the Cloudflare
 * client IP.
 */
const clientKey = (c: Context<AppEnv>): string => {
  const user = c.get("user") as AppEnv["Variables"]["user"] | undefined;
  if (user) return `user:${user.sub}`;
  return `ip:${c.req.header("cf-connecting-ip") ?? "unknown"}`;
};

/**
 * Rate-limit middleware backed by a Cloudflare native rate-limit binding.
 * `pick` selects which configured limiter to use; `period` is only used to
 * populate the `Retry-After` header and should match the binding's period.
 *
 *   app.use("*", rateLimit((env) => env.API_RATELIMIT));
 *   auth.post("/google", rateLimit((env) => env.AUTH_RATELIMIT), handler);
 */
export const rateLimit = (pick: (env: Bindings) => RateLimit, period = 60) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const { success } = await pick(c.env).limit({ key: clientKey(c) });
    if (!success) {
      return c.json({ error: "Too many requests" }, 429, {
        "Retry-After": String(period),
      });
    }
    await next();
  });
