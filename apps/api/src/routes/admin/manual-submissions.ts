import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { getDb, type Db } from "../../db/client";
import {
  courses,
  manualSubmissions,
  type ManualSubmission,
  type User,
} from "../../db/schema";
import { buildMeta } from "../../lib/pagination";
import { parseId } from "../../lib/parse-id";
import { fileUrlFor, toAuthUser } from "../../lib/user-shape";
import { validate } from "../../lib/validator";
import {
  adminManualSubmissionRejectSchema,
  adminManualSubmissionsListQuery,
  adminManualSubmissionUpdateSchema,
  type AdminManualSubmissionUpdateInput,
} from "../../schemas/admin/manual-submissions";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

const lookupWith = {
  department: { columns: { id: true, name: true, shortName: true } },
  course: { columns: { id: true, departmentId: true, name: true } },
  semester: { columns: { id: true, name: true } },
  examType: { columns: { id: true, name: true } },
  user: {
    columns: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      imageKey: true,
      createdAt: true,
    },
  },
  reviewer: {
    columns: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      imageKey: true,
      createdAt: true,
    },
  },
  question: { columns: { id: true } },
  submission: { columns: { id: true } },
} as const;

type EmbeddedUser = Pick<
  User,
  "id" | "name" | "email" | "username" | "role" | "imageKey" | "createdAt"
>;

type AdminManualSubmissionRow = ManualSubmission & {
  department: { id: number; name: string; shortName: string };
  course: { id: number; departmentId: number; name: string };
  semester: { id: number; name: string };
  examType: { id: number; name: string };
  user: EmbeddedUser;
  reviewer: EmbeddedUser | null;
  question: { id: number } | null;
  submission: { id: number } | null;
};

const toAdminManualSubmission = (
  row: AdminManualSubmissionRow,
  origin: string,
) => ({
  id: row.id,
  userId: row.userId,
  contributor: toAuthUser(row.user, origin),
  department: row.department,
  course: row.course,
  semester: row.semester,
  examType: row.examType,
  status: row.status,
  rejectedReason: row.rejectedReason,
  reviewedBy: row.reviewedBy,
  reviewer: row.reviewer ? toAuthUser(row.reviewer, origin) : null,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  createdAt: row.createdAt,
});

const loadManualSubmission = async (db: Db, id: number, origin: string) => {
  const row = await db.query.manualSubmissions.findFirst({
    where: eq(manualSubmissions.id, id),
    with: lookupWith,
  });
  return row ? toAdminManualSubmission(row, origin) : null;
};

const ensureCourseDepartment = async (
  db: Db,
  departmentId: number,
  courseId: number,
): Promise<void> => {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.departmentId, departmentId)),
    columns: { id: true },
  });
  if (!course) {
    throw new HTTPException(400, {
      message: "Course does not belong to the selected department",
    });
  }
};

const deletePdf = async (bucket: R2Bucket, key: string): Promise<void> => {
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed for manual submission PDF", key, err);
  }
};

route.get("/", validate("query", adminManualSubmissionsListQuery), async (c) => {
  const {
    page,
    perPage,
    status,
    userId,
    departmentId,
    courseId,
    semesterId,
    examTypeId,
  } = c.req.valid("query");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const filters: SQL[] = [];
  if (status) filters.push(eq(manualSubmissions.status, status));
  if (userId) filters.push(eq(manualSubmissions.userId, userId));
  if (departmentId)
    filters.push(eq(manualSubmissions.departmentId, departmentId));
  if (courseId) filters.push(eq(manualSubmissions.courseId, courseId));
  if (semesterId) filters.push(eq(manualSubmissions.semesterId, semesterId));
  if (examTypeId) filters.push(eq(manualSubmissions.examTypeId, examTypeId));
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.manualSubmissions.findMany({
      where,
      with: lookupWith,
      orderBy: [desc(manualSubmissions.createdAt), desc(manualSubmissions.id)],
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    db.select({ value: count() }).from(manualSubmissions).where(where),
  ]);

  return c.json({
    data: items.map((item) => toAdminManualSubmission(item, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const detail = await loadManualSubmission(
    getDb(c.env.DB),
    id,
    new URL(c.req.url).origin,
  );
  if (!detail) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  return c.json(detail);
});

route.patch(
  "/:id",
  validate("json", adminManualSubmissionUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }

    const input = c.req.valid("json");
    if (Object.keys(input).length === 0) {
      throw new HTTPException(400, { message: "No fields to update" });
    }

    const db = getDb(c.env.DB);
    const [existing] = await db
      .select({
        status: manualSubmissions.status,
        departmentId: manualSubmissions.departmentId,
        courseId: manualSubmissions.courseId,
      })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.id, id))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }
    if (existing.status === "approved") {
      throw new HTTPException(409, {
        message: "Approved manual submissions cannot be edited",
      });
    }

    const update: AdminManualSubmissionUpdateInput = input;
    await ensureCourseDepartment(
      db,
      update.departmentId ?? existing.departmentId,
      update.courseId ?? existing.courseId,
    );

    await db
      .update(manualSubmissions)
      .set(update)
      .where(eq(manualSubmissions.id, id));

    const detail = await loadManualSubmission(
      db,
      id,
      new URL(c.req.url).origin,
    );
    if (!detail) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }
    return c.json(detail);
  },
);

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({
      status: manualSubmissions.status,
      pdfKey: manualSubmissions.pdfKey,
    })
    .from(manualSubmissions)
    .where(eq(manualSubmissions.id, id))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  await db.delete(manualSubmissions).where(eq(manualSubmissions.id, id));
  if (row.status !== "approved") {
    await deletePdf(c.env.BUCKET, row.pdfKey);
  }
  return c.body(null, 204);
});

route.post("/:id/approve", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(manualSubmissions)
    .where(eq(manualSubmissions.id, id))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  if (row.status === "approved") {
    throw new HTTPException(409, {
      message: "Manual submission is already approved",
    });
  }

  await ensureCourseDepartment(db, row.departmentId, row.courseId);
  const object = await c.env.BUCKET.head(row.pdfKey);
  if (!object) {
    throw new HTTPException(409, {
      message: "Manual submission PDF is missing from storage",
    });
  }

  const reviewerId = c.get("user").sub;
  const questionInsert = c.env.DB.prepare(
    `INSERT INTO questions (department_id, course_id, semester_id, exam_type_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (department_id, course_id, semester_id, exam_type_id) DO NOTHING`,
  ).bind(row.departmentId, row.courseId, row.semesterId, row.examTypeId);

  const submissionInsert = c.env.DB.prepare(
    `INSERT INTO submissions
       (question_id, user_id, section, batch, pdf_key, file_size,
        watermarked_pdf_key, watermark_status, watermark_error)
     SELECT q.id, m.user_id, NULL, NULL, m.pdf_key, ?, NULL, 'awaiting', NULL
     FROM manual_submissions AS m
     JOIN questions AS q
       ON q.department_id = m.department_id
      AND q.course_id = m.course_id
      AND q.semester_id = m.semester_id
      AND q.exam_type_id = m.exam_type_id
     WHERE m.id = ?
       AND m.status <> 'approved'
       AND NOT EXISTS (
         SELECT 1 FROM submissions AS s WHERE s.pdf_key = m.pdf_key
       )`,
  ).bind(object.size, id);

  const reviewUpdate = c.env.DB.prepare(
    `UPDATE manual_submissions
     SET status = 'approved',
         rejected_reason = NULL,
         reviewed_by = ?,
         question_id = (
           SELECT q.id FROM questions AS q
           WHERE q.department_id = manual_submissions.department_id
             AND q.course_id = manual_submissions.course_id
             AND q.semester_id = manual_submissions.semester_id
             AND q.exam_type_id = manual_submissions.exam_type_id
         ),
         submission_id = (
           SELECT s.id FROM submissions AS s
           WHERE s.pdf_key = manual_submissions.pdf_key
             AND s.user_id = manual_submissions.user_id
           ORDER BY s.id DESC
           LIMIT 1
         )
     WHERE id = ? AND status <> 'approved'`,
  ).bind(reviewerId, id);

  const results = await c.env.DB.batch([
    questionInsert,
    submissionInsert,
    reviewUpdate,
  ]);
  if ((results[2]?.meta.changes ?? 0) === 0) {
    throw new HTTPException(409, {
      message: "Manual submission could not be approved",
    });
  }

  const detail = await loadManualSubmission(
    db,
    id,
    new URL(c.req.url).origin,
  );
  if (!detail) {
    throw new HTTPException(500, {
      message: "Failed to load approved manual submission",
    });
  }
  return c.json(detail);
});

route.post(
  "/:id/reject",
  validate("json", adminManualSubmissionRejectSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }

    const { reason } = c.req.valid("json");
    const db = getDb(c.env.DB);
    const [existing] = await db
      .select({ status: manualSubmissions.status })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.id, id))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Manual submission not found" });
    }
    if (existing.status === "approved") {
      throw new HTTPException(409, {
        message: "Approved manual submissions cannot be rejected",
      });
    }

    await db
      .update(manualSubmissions)
      .set({
        status: "rejected",
        rejectedReason: reason,
        reviewedBy: c.get("user").sub,
        questionId: null,
        submissionId: null,
      })
      .where(eq(manualSubmissions.id, id));

    const detail = await loadManualSubmission(
      db,
      id,
      new URL(c.req.url).origin,
    );
    if (!detail) {
      throw new HTTPException(500, {
        message: "Failed to load rejected manual submission",
      });
    }
    return c.json(detail);
  },
);

export default route;
