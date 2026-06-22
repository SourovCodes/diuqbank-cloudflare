import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { count, desc, eq, gt } from "drizzle-orm";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { buildMeta } from "../lib/pagination";
import { toContributor } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { contributorsListQuery } from "../schemas/contributors";
import type { AppEnv } from "../types";

const contributors = new Hono<AppEnv>();

// Contributors = users with at least one submission, most prolific first.
contributors.get("/", validate("query", contributorsListQuery), async (c) => {
  const { page, perPage } = c.req.valid("query");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageKey: users.imageKey,
      createdAt: users.createdAt,
      submissionCount: users.submissionCount,
    })
    .from(users)
    .where(gt(users.submissionCount, 0))
    .orderBy(desc(users.submissionCount), desc(users.id))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(users)
    .where(gt(users.submissionCount, 0));

  return c.json({
    data: rows.map((row) => toContributor(row, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

contributors.get("/:username", async (c) => {
  const username = c.req.param("username");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageKey: users.imageKey,
      createdAt: users.createdAt,
      submissionCount: users.submissionCount,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new HTTPException(404, { message: "Contributor not found" });
  }

  return c.json(toContributor(user, origin));
});

export default contributors;
