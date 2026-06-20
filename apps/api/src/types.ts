import type { AuthPayload } from "./lib/jwt";

/** Cloudflare bindings from wrangler.jsonc + secrets. */
export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  // Google OAuth client id; used as the expected `aud` when verifying ID tokens.
  GOOGLE_CLIENT_ID: string;
};

/** Hono environment: bindings + context variables set by middleware. */
export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    // Set by requireAuth on protected routes.
    user: AuthPayload;
  };
};
