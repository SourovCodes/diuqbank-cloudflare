import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

import type { AppBindings } from "../env";

/**
 * Verify the `Authorization: Bearer <jwt>` header and populate `c.var.user`.
 * Returns 401 when the header is missing or the token is invalid/expired.
 *
 * Attach to any protected route via `createRoute({ middleware: [requireAuth] })`.
 */
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = await verify(token, c.env.JWT_SECRET, "HS256");
    c.set("user", { id: Number(payload.sub), email: String(payload.email) });
  } catch {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  await next();
});
