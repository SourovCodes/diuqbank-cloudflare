import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { asc, count, eq, like } from "drizzle-orm";

import { getDb } from "../../db/client";
import { questions, semesters } from "../../db/schema";
import { buildMeta } from "../../lib/pagination";
import { parseId } from "../../lib/parse-id";
import { validate } from "../../lib/validator";
import {
  semesterCreateSchema,
  semestersListQuery,
  semesterUpdateSchema,
} from "../../schemas/admin/semesters";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

route.get("/", validate("query", semestersListQuery), async (c) => {
  const { page, perPage, search } = c.req.valid("query");
  const db = getDb(c.env.DB);

  const where = search ? like(semesters.name, `%${search}%`) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(semesters)
      .where(where)
      .orderBy(asc(semesters.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(semesters).where(where),
  ]);

  return c.json({ data: items, meta: buildMeta(page, perPage, total) });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Semester not found" });

  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(semesters)
    .where(eq(semesters.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "Semester not found" });

  return c.json(row);
});

route.post("/", validate("json", semesterCreateSchema), async (c) => {
  const input = c.req.valid("json");
  const db = getDb(c.env.DB);
  const [row] = await db.insert(semesters).values(input).returning();
  return c.json(row, 201);
});

route.patch("/:id", validate("json", semesterUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Semester not found" });

  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .update(semesters)
    .set(input)
    .where(eq(semesters.id, id))
    .returning();
  if (!row) throw new HTTPException(404, { message: "Semester not found" });

  return c.json(row);
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Semester not found" });

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ id: semesters.id })
    .from(semesters)
    .where(eq(semesters.id, id))
    .limit(1);
  if (!existing) throw new HTTPException(404, { message: "Semester not found" });

  // Delete safety: the FK from questions is `restrict`.
  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .where(eq(questions.semesterId, id));
  if (questionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${questionCount} question(s) reference this semester`,
    });
  }

  await db.delete(semesters).where(eq(semesters.id, id));
  return c.body(null, 204);
});

export default route;
