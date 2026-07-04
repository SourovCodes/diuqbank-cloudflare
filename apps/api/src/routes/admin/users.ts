import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
  autoSubmissions,
  manualSubmissions,
  submissions,
  users,
} from "../../db/schema";
import { bumpCache, invalidateUser } from "../../lib/cache";
import { toAdminUser } from "../../lib/admin-shape";
import { buildMeta } from "../../shared/utils/pagination";
import { parseId } from "../../lib/parse-id";
import { validate } from "../../lib/validator";
import { userUpdateSchema, usersListQuery } from "../../shared/schemas/admin/users";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

const adminUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  username: users.username,
  role: users.role,
  imageKey: users.imageKey,
  submissionCount: users.submissionCount,
  createdAt: users.createdAt,
};

route.get("/", validate("query", usersListQuery), async (c) => {
  const { page, perPage, search, role } = c.req.valid("query");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const filters: SQL[] = [];
  if (role) filters.push(eq(users.role, role));
  if (search) {
    const term = `%${search}%`;
    const expr = or(
      like(users.name, term),
      like(users.email, term),
      like(users.username, term),
    );
    if (expr) filters.push(expr);
  }
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select(adminUserColumns)
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(users).where(where),
  ]);

  return c.json({
    data: rows.map((u) => toAdminUser(u, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "User not found" });

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const [row] = await db
    .select(adminUserColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "User not found" });

  return c.json(toAdminUser(row, origin));
});

route.patch("/:id", validate("json", userUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "User not found" });

  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  // Guard: don't let an admin strip their own admin role.
  const self = c.get("user");
  if (id === self.sub && input.role === "user") {
    throw new HTTPException(409, {
      message: "You cannot remove your own admin role",
    });
  }

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  // A duplicate username surfaces as a UNIQUE constraint error → 409 via onError.
  const [updated] = await db
    .update(users)
    .set(input)
    .where(eq(users.id, id))
    .returning(adminUserColumns);
  if (!updated) throw new HTTPException(404, { message: "User not found" });

  c.executionCtx.waitUntil(invalidateUser(c.env, id, updated.username));

  return c.json(toAdminUser(updated, origin));
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "User not found" });

  // Guard: don't let an admin delete their own account.
  const self = c.get("user");
  if (id === self.sub) {
    throw new HTTPException(409, { message: "You cannot delete your own account" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ imageKey: users.imageKey, username: users.username })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "User not found" });

  // Delete safety: the FK from submissions is `restrict` (every submission must
  // keep a contributor), so pre-count and return a 409 instead of a raw FK-400.
  const [{ value: submissionCount }] = await db
    .select({ value: count() })
    .from(submissions)
    .where(eq(submissions.userId, id));
  if (submissionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${submissionCount} submission(s) reference this user`,
    });
  }

  const [{ value: manualSubmissionCount }] = await db
    .select({ value: count() })
    .from(manualSubmissions)
    .where(eq(manualSubmissions.userId, id));
  if (manualSubmissionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${manualSubmissionCount} manual submission(s) reference this user`,
    });
  }

  // `auto_submissions.user_id` is also `restrict`; pre-count so an owned
  // auto-submission returns a clean 409 instead of a raw FK-constraint 400.
  const [{ value: autoSubmissionCount }] = await db
    .select({ value: count() })
    .from(autoSubmissions)
    .where(eq(autoSubmissions.userId, id));
  if (autoSubmissionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${autoSubmissionCount} auto submission(s) reference this user`,
    });
  }

  await db.delete(users).where(eq(users.id, id));

  if (row.imageKey) {
    try {
      await c.env.BUCKET.delete(row.imageKey);
    } catch (err) {
      console.error("R2 delete failed for user image", row.imageKey, err);
    }
  }

  // Only `/auth/me` (and a never-populated contributor cache, since a deletable
  // user has 0 submissions) can reference this user.
  c.executionCtx.waitUntil(bumpCache(c.env, `user:${id}`, `c:${row.username}`));

  return c.body(null, 204);
});

export default route;
