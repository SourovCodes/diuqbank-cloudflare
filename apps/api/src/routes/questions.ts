import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { getDb } from "../db/client";
import { questions, submissions } from "../db/schema";
import { withCache } from "../lib/cache";
import { buildMeta } from "../shared/utils/pagination";
import { parseId } from "../lib/parse-id";
import { buildQuestionTitle } from "../shared/utils/question-title";
import { fileUrlFor, toContributorSummary } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { questionsListQuery } from "../shared/schemas/questions";
import type { AppEnv } from "../types";

const questionRoutes = new Hono<AppEnv>();

// Column selections for the nested lookup entities embedded in a question.
const entityColumns = {
  department: { columns: { id: true, name: true, shortName: true } },
  course: { columns: { id: true, departmentId: true, name: true } },
  semester: { columns: { id: true, name: true } },
  examType: { columns: { id: true, name: true } },
} as const;

questionRoutes.get("/", validate("query", questionsListQuery), (c) => {
  const { page, perPage, departmentId, courseId, semesterId, examTypeId } =
    c.req.valid("query");

  // Cached on `q:list`; bumped whenever a question or submission is created or
  // removed, or taxonomy changes (titles/filters).
  const key = `questions:list:${page}:${perPage}:${departmentId ?? ""}:${courseId ?? ""}:${semesterId ?? ""}:${examTypeId ?? ""}`;

  return withCache(c, { versions: ["q:list"], key }, async () => {
    const db = getDb(c.env.DB);

    const filters: SQL[] = [];
    if (departmentId) filters.push(eq(questions.departmentId, departmentId));
    if (courseId) filters.push(eq(questions.courseId, courseId));
    if (semesterId) filters.push(eq(questions.semesterId, semesterId));
    if (examTypeId) filters.push(eq(questions.examTypeId, examTypeId));
    const where = filters.length ? and(...filters) : undefined;

    const items = await db.query.questions.findMany({
      where,
      columns: { id: true, submissionCount: true, viewCount: true },
      with: entityColumns,
      orderBy: desc(questions.id),
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(questions)
      .where(where);

    return {
      data: items.map((q) => ({
        id: q.id,
        title: buildQuestionTitle(q),
        submissionCount: q.submissionCount,
        viewCount: q.viewCount,
        department: q.department,
        course: q.course,
        semester: q.semester,
        examType: q.examType,
      })),
      meta: buildMeta(page, perPage, total),
    };
  });
});

questionRoutes.get("/:id", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Question not found" });
  }

  // Depends on this question (`q:<id>`) and the taxonomy names in its title (`tax`).
  return withCache(c, { versions: [`q:${id}`, "tax"], key: `questions:${id}` }, async () => {
    const db = getDb(c.env.DB);

    const question = await db.query.questions.findFirst({
      where: eq(questions.id, id),
      columns: { id: true, submissionCount: true, viewCount: true },
      with: entityColumns,
    });

    if (!question) {
      throw new HTTPException(404, { message: "Question not found" });
    }

    return {
      id: question.id,
      title: buildQuestionTitle(question),
      submissionCount: question.submissionCount,
      viewCount: question.viewCount,
      department: question.department,
      course: question.course,
      semester: question.semester,
      examType: question.examType,
    };
  });
});

// All submissions for a question (no pagination — a single question has few).
questionRoutes.get("/:id/submissions", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Question not found" });
  }

  // Depends on this question's submissions (`q:<id>`) and on `tax`: a taxonomy
  // merge can move submissions between questions (or delete this question)
  // without touching the `q:<id>` token, so `tax` closes that staleness gap.
  // Contributor name/avatar drift in this list is bounded by the cache TTL.
  return withCache(
    c,
    { versions: [`q:${id}`, "tax"], key: `questions:${id}:submissions` },
    async () => {
      const db = getDb(c.env.DB);
      const origin = new URL(c.req.url).origin;

      // Confirm the question exists so a bad id is a clear 404, not an empty list.
      const question = await db.query.questions.findFirst({
        where: eq(questions.id, id),
        columns: { id: true },
      });
      if (!question) {
        throw new HTTPException(404, { message: "Question not found" });
      }

      const rows = await db.query.submissions.findMany({
        where: eq(submissions.questionId, id),
        columns: {
          id: true,
          section: true,
          batch: true,
          fileSize: true,
          viewCount: true,
          createdAt: true,
          pdfKey: true,
          watermarkedPdfKey: true,
        },
        with: {
          user: { columns: { id: true, name: true, username: true, imageKey: true } },
        },
        orderBy: desc(submissions.createdAt),
      });

      return {
        data: rows.map((s) => ({
          id: s.id,
          section: s.section,
          batch: s.batch,
          fileSize: s.fileSize,
          viewCount: s.viewCount,
          createdAt: s.createdAt,
          // Prefer the watermarked file once it exists; fall back to the original.
          pdfUrl: fileUrlFor(origin, s.watermarkedPdfKey ?? s.pdfKey),
          contributor: s.user ? toContributorSummary(s.user, origin) : null,
        })),
      };
    },
  );
});

export default questionRoutes;
