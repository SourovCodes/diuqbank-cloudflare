import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { verifyAuthToken } from "../lib/jwt";
import type { AppEnv } from "../types";

/** Require a valid `Authorization: Bearer <jwt>`; populates `c.var.user`. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing bearer token" });
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = await verifyAuthToken(token, c.env.JWT_SECRET);
    c.set("user", payload);
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }
  await next();
});

/** Require the authenticated user to have `role: "admin"`. Use after requireAuth. */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  // Defensive: requireAuth must run first and populate `user`. If it didn't,
  // that's a missing/invalid token (401), not an authorization failure.
  if (!user) {
    throw new HTTPException(401, { message: "Missing bearer token" });
  }

  const [currentUser] = await getDb(c.env.DB)
    .select({ username: users.username, role: users.role })
    .from(users)
    .where(eq(users.id, user.sub))
    .limit(1);

  if (!currentUser || currentUser.role !== "admin") {
    throw new HTTPException(403, { message: "Admin access required" });
  }

  c.set("user", { ...user, username: currentUser.username, role: currentUser.role });
  await next();
});
