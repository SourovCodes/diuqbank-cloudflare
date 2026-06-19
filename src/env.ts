/**
 * Typed Cloudflare bindings and Hono context variables shared across the app.
 *
 * - `Bindings` come from wrangler.jsonc (D1) and secrets (JWT_SECRET).
 * - `Variables` are values set by middleware (e.g. the authenticated user).
 */
export interface AppBindings {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
  Variables: {
    // Set by the require-auth middleware on protected routes.
    user: { id: number; email: string };
  };
}
