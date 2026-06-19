import type { AuthPayload } from "./lib/jwt";

/** Cloudflare bindings from wrangler.jsonc + secrets. */
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

/** Hono environment: bindings + context variables set by middleware. */
export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    // Set by requireAuth on protected routes.
    user: AuthPayload;
  };
};
