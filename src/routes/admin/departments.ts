import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { asc, count, eq, like, or } from "drizzle-orm";

import { getDb } from "../../db/client";
import {
  courses,
  departments,
  questions,
} from "../../db/schema";
import { buildMeta } from "../../shared/utils/pagination";
import { parseId } from "../../lib/parse-id";
import { planDepartmentMerge, runMerge } from "../../lib/merge";
import { validate } from "../../lib/validator";
import {
  departmentCreateSchema,
  departmentsListQuery,
  departmentUpdateSchema,
} from "../../shared/schemas/admin/departments";
import { mergeSchema } from "../../shared/schemas/admin/merge";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

route.get("/", validate("query", departmentsListQuery), async (c) => {
  const { page, perPage, search } = c.req.valid("query");
  const db = getDb(c.env.DB);

  const where = search
    ? or(
        like(departments.name, `%${search}%`),
        like(departments.shortName, `%${search}%`),
      )
    : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(departments)
      .where(where)
      .orderBy(asc(departments.name))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(departments).where(where),
  ]);

  return c.json({ data: items, meta: buildMeta(page, perPage, total) });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Department not found" });

  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "Department not found" });

  return c.json(row);
});

route.post("/merge", validate("json", mergeSchema), async (c) => {
  const { keepId, mergeIds, dryRun } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const plan = await planDepartmentMerge(c.env.DB, keepId, mergeIds);
  if (!dryRun) await runMerge(plan);

  const [keeper] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, keepId))
    .limit(1);
  if (!keeper) throw new HTTPException(404, { message: "Department not found" });

  return dryRun
    ? c.json({ preview: plan.counts, keeper })
    : c.json({ keeper, summary: plan.counts });
});

route.post("/", validate("json", departmentCreateSchema), async (c) => {
  const input = c.req.valid("json");
  const db = getDb(c.env.DB);
  const [row] = await db.insert(departments).values(input).returning();
  return c.json(row, 201);
});

route.patch("/:id", validate("json", departmentUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Department not found" });

  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .update(departments)
    .set(input)
    .where(eq(departments.id, id))
    .returning();
  if (!row) throw new HTTPException(404, { message: "Department not found" });

  return c.json(row);
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Department not found" });

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  if (!existing) throw new HTTPException(404, { message: "Department not found" });

  // Delete safety: FKs from courses and questions are `restrict`.
  const [{ value: courseCount }] = await db
    .select({ value: count() })
    .from(courses)
    .where(eq(courses.departmentId, id));
  if (courseCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${courseCount} course(s) reference this department`,
    });
  }
  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.departmentId, id));
  if (questionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${questionCount} question(s) reference this department`,
    });
  }

  await db.delete(departments).where(eq(departments.id, id));
  return c.body(null, 204);
});

export default route;
