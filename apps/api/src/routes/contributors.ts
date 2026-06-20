import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { count, countDistinct, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "../db/client";
import { submissions, users } from "../db/schema";
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
      submissionCount: count(submissions.id),
    })
    .from(users)
    .innerJoin(submissions, eq(submissions.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(count(submissions.id)), desc(users.id))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const [{ value: total }] = await db
    .select({ value: countDistinct(submissions.userId) })
    .from(submissions)
    .where(isNotNull(submissions.userId));

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
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new HTTPException(404, { message: "Contributor not found" });
  }

  const [{ value: submissionCount }] = await db
    .select({ value: count() })
    .from(submissions)
    .where(eq(submissions.userId, user.id));

  return c.json(toContributor({ ...user, submissionCount }, origin));
});

export default contributors;
