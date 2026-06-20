import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";

import { getDb } from "../db/client";
import { questions, submissions } from "../db/schema";
import { buildMeta } from "../lib/pagination";
import { fileUrlFor, toContributorSummary } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { questionsListQuery } from "../schemas/questions";
import type { AppEnv } from "../types";

const questionRoutes = new Hono<AppEnv>();

// Column selections for the nested lookup entities embedded in a question.
const entityColumns = {
  department: { columns: { id: true, name: true, shortName: true } },
  course: { columns: { id: true, departmentId: true, name: true } },
  semester: { columns: { id: true, name: true } },
  examType: { columns: { id: true, name: true } },
} as const;

questionRoutes.get("/", validate("query", questionsListQuery), async (c) => {
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
    columns: { id: true },
    with: entityColumns,
    orderBy: desc(questions.id),
    limit: perPage,
    offset: (page - 1) * perPage,
  });

  // submissionCount per question is computed dynamically (the denormalized
  // column isn't trigger-maintained). One grouped query covers the page.
  const ids = items.map((q) => q.id);
  const countMap = new Map<number, number>();
  if (ids.length) {
    const counts = await db
      .select({ questionId: submissions.questionId, value: count() })
      .from(submissions)
      .where(inArray(submissions.questionId, ids))
      .groupBy(submissions.questionId);
    for (const row of counts) countMap.set(row.questionId, row.value);
  }

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(questions)
    .where(where);

  return c.json({
    data: items.map((q) => ({
      id: q.id,
      submissionCount: countMap.get(q.id) ?? 0,
      department: q.department,
      course: q.course,
      semester: q.semester,
      examType: q.examType,
    })),
    meta: buildMeta(page, perPage, total),
  });
});

questionRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new HTTPException(404, { message: "Question not found" });
  }

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const question = await db.query.questions.findFirst({
    where: eq(questions.id, id),
    columns: { id: true },
    with: {
      ...entityColumns,
      submissions: {
        columns: {
          id: true,
          section: true,
          batch: true,
          fileSize: true,
          watermarkStatus: true,
          createdAt: true,
          pdfKey: true,
        },
        with: {
          user: { columns: { id: true, name: true, username: true, imageKey: true } },
        },
        orderBy: (s, { desc: descOp }) => descOp(s.createdAt),
      },
    },
  });

  if (!question) {
    throw new HTTPException(404, { message: "Question not found" });
  }

  return c.json({
    id: question.id,
    submissionCount: question.submissions.length,
    department: question.department,
    course: question.course,
    semester: question.semester,
    examType: question.examType,
    submissions: question.submissions.map((s) => ({
      id: s.id,
      section: s.section,
      batch: s.batch,
      fileSize: s.fileSize,
      watermarkStatus: s.watermarkStatus,
      createdAt: s.createdAt,
      pdfUrl: fileUrlFor(origin, s.pdfKey),
      contributor: s.user ? toContributorSummary(s.user, origin) : null,
    })),
  });
});

export default questionRoutes;
