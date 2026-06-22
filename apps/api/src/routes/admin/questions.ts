import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { getDb, type Db } from "../../db/client";
import { questions, submissions } from "../../db/schema";
import { buildMeta } from "../../lib/pagination";
import { parseId } from "../../lib/parse-id";
import { buildQuestionTitle } from "../../lib/question-title";
import { validate } from "../../lib/validator";
import {
  questionCreateSchema,
  questionUpdateSchema,
} from "../../schemas/admin/questions";
import { questionsListQuery } from "../../schemas/questions";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

const questionColumns = {
  id: true,
  departmentId: true,
  courseId: true,
  semesterId: true,
  examTypeId: true,
  submissionCount: true,
} as const;

const entityColumns = {
  department: { columns: { id: true, name: true, shortName: true } },
  course: { columns: { id: true, departmentId: true, name: true } },
  semester: { columns: { id: true, name: true } },
  examType: { columns: { id: true, name: true } },
} as const;

// Load a single question with its entities + submission count, in the admin
// detail shape (raw FK ids alongside the nested entities). Null if absent.
const loadQuestion = async (db: Db, id: number) => {
  const q = await db.query.questions.findFirst({
    where: eq(questions.id, id),
    columns: questionColumns,
    with: entityColumns,
  });
  if (!q) return null;

  return {
    id: q.id,
    title: buildQuestionTitle(q),
    departmentId: q.departmentId,
    courseId: q.courseId,
    semesterId: q.semesterId,
    examTypeId: q.examTypeId,
    submissionCount: q.submissionCount,
    department: q.department,
    course: q.course,
    semester: q.semester,
    examType: q.examType,
  };
};

// Reuses the public list query: pageFields + 4 optional id filters.
route.get("/", validate("query", questionsListQuery), async (c) => {
  const { page, perPage, departmentId, courseId, semesterId, examTypeId } =
    c.req.valid("query");
  const db = getDb(c.env.DB);

  const filters: SQL[] = [];
  if (departmentId) filters.push(eq(questions.departmentId, departmentId));
  if (courseId) filters.push(eq(questions.courseId, courseId));
  if (semesterId) filters.push(eq(questions.semesterId, semesterId));
  if (examTypeId) filters.push(eq(questions.examTypeId, examTypeId));
  const where = filters.length ? and(...filters) : undefined;

  const items = await db.query.questions.findMany({
    where,
    columns: questionColumns,
    with: entityColumns,
    orderBy: desc(questions.id),
    limit: perPage,
    offset: (page - 1) * perPage,
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(questions)
    .where(where);

  return c.json({
    data: items.map((q) => ({
      id: q.id,
      title: buildQuestionTitle(q),
      departmentId: q.departmentId,
      courseId: q.courseId,
      semesterId: q.semesterId,
      examTypeId: q.examTypeId,
      submissionCount: q.submissionCount,
      department: q.department,
      course: q.course,
      semester: q.semester,
      examType: q.examType,
    })),
    meta: buildMeta(page, perPage, total),
  });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Question not found" });

  const db = getDb(c.env.DB);
  const detail = await loadQuestion(db, id);
  if (!detail) throw new HTTPException(404, { message: "Question not found" });

  return c.json(detail);
});

route.post("/", validate("json", questionCreateSchema), async (c) => {
  const input = c.req.valid("json");
  const db = getDb(c.env.DB);

  // Combo-unique violation → 409, bad FK → 400 (both via the global onError).
  const [created] = await db
    .insert(questions)
    .values(input)
    .returning({ id: questions.id });

  const detail = await loadQuestion(db, created.id);
  if (!detail) throw new HTTPException(500, { message: "Failed to load created question" });

  return c.json(detail, 201);
});

route.patch("/:id", validate("json", questionUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Question not found" });

  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const db = getDb(c.env.DB);
  const [updated] = await db
    .update(questions)
    .set(input)
    .where(eq(questions.id, id))
    .returning({ id: questions.id });
  if (!updated) throw new HTTPException(404, { message: "Question not found" });

  const detail = await loadQuestion(db, id);
  if (!detail) throw new HTTPException(404, { message: "Question not found" });

  return c.json(detail);
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Question not found" });

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.id, id))
    .limit(1);
  if (!existing) throw new HTTPException(404, { message: "Question not found" });

  // Delete safety: the FK from submissions is `restrict`.
  const [{ value: submissionCount }] = await db
    .select({ value: count() })
    .from(submissions)
    .where(eq(submissions.questionId, id));
  if (submissionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${submissionCount} submission(s) reference this question`,
    });
  }

  await db.delete(questions).where(eq(questions.id, id));
  return c.body(null, 204);
});

export default route;
