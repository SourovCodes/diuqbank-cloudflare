import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";

import type { AppBindings } from "../env";

/**
 * Create a feature router. Every route module builds on this so the bindings,
 * strict-mode, and validation behaviour stay consistent.
 *
 * The `defaultHook` turns any failed request validation (params, query, json
 * body, headers) into a consistent 422 response instead of throwing.
 */
export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json({ success: false, error: result.error.flatten() }, 422);
      }
    },
  });
}

/** Create the root application with global middleware and error handlers. */
export function createApp() {
  const app = createRouter();

  app.use("*", logger());

  app.notFound((c) => c.json({ success: false, message: "Not Found" }, 404));

  app.onError((err, c) => {
    console.error(err);
    return c.json({ success: false, message: "Internal Server Error" }, 500);
  });

  return app;
}
