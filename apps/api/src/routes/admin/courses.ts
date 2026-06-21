import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, asc, count, eq, like, type SQL } from "drizzle-orm";

import { getDb } from "../../db/client";
import { courses, questions } from "../../db/schema";
import { buildMeta } from "../../lib/pagination";
import { parseId } from "../../lib/parse-id";
import { validate } from "../../lib/validator";
import {
  courseCreateSchema,
  coursesListQuery,
  courseUpdateSchema,
} from "../../schemas/admin/courses";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

route.get("/", validate("query", coursesListQuery), async (c) => {
  const { page, perPage, search, departmentId } = c.req.valid("query");
  const db = getDb(c.env.DB);

  const filters: SQL[] = [];
  if (departmentId) filters.push(eq(courses.departmentId, departmentId));
  if (search) filters.push(like(courses.name, `%${search}%`));
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(courses)
      .where(where)
      .orderBy(asc(courses.name))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(courses).where(where),
  ]);

  return c.json({ data: items, meta: buildMeta(page, perPage, total) });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Course not found" });

  const db = getDb(c.env.DB);
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) throw new HTTPException(404, { message: "Course not found" });

  return c.json(row);
});

route.post("/", validate("json", courseCreateSchema), async (c) => {
  const input = c.req.valid("json");
  const db = getDb(c.env.DB);
  const [row] = await db.insert(courses).values(input).returning();
  return c.json(row, 201);
});

route.patch("/:id", validate("json", courseUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Course not found" });

  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .update(courses)
    .set(input)
    .where(eq(courses.id, id))
    .returning();
  if (!row) throw new HTTPException(404, { message: "Course not found" });

  return c.json(row);
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Course not found" });

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  if (!existing) throw new HTTPException(404, { message: "Course not found" });

  // Delete safety: the FK from questions is `restrict`.
  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.courseId, id));
  if (questionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${questionCount} question(s) reference this course`,
    });
  }

  await db.delete(courses).where(eq(courses.id, id));
  return c.body(null, 204);
});

export default route;
