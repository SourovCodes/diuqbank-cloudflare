import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, or, sql, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { getDb, type Db } from "../../db/client";
import {
  courses,
  departments,
  examTypes,
  manualSubmissions,
  semesters,
  type ManualSubmission as ManualSubmissionRow,
  type User,
} from "../../db/schema";
import { buildMeta } from "../../shared/utils/pagination";
import type { AdminManualSubmission } from "../../shared/types";
import { parseId } from "../../lib/parse-id";
import { startWatermark } from "../../lib/pdf-processor";
import { fileUrlFor, toAuthUser } from "../../lib/user-shape";
import { validate } from "../../lib/validator";
import {
  adminManualSubmissionRejectSchema,
  adminManualSubmissionsListQuery,
  adminManualSubmissionUpdateSchema,
  type AdminManualSubmissionUpdateInput,
} from "../../shared/schemas/admin/manual-submissions";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

const lookupWith = {
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

type AdminManualSubmissionRow = ManualSubmissionRow & {
  user: EmbeddedUser;
  reviewer: EmbeddedUser | null;
  question: { id: number } | null;
  submission: { id: number } | null;
};

const toAdminManualSubmission = (
  row: AdminManualSubmissionRow,
  origin: string,
): AdminManualSubmission => ({
  id: row.id,
  userId: row.userId,
  contributor: toAuthUser(row.user, origin),
  departmentName: row.departmentName,
  departmentShortName: row.departmentShortName,
  courseName: row.courseName,
  semesterName: row.semesterName,
  examTypeName: row.examTypeName,
  note: row.note,
  status: row.status,
  rejectedReason: row.rejectedReason,
  reviewedBy: row.reviewedBy,
  reviewer: row.reviewer ? toAuthUser(row.reviewer, origin) : null,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  createdAt: row.createdAt,
});

export const loadManualSubmission = async (db: Db, id: number, origin: string) => {
  const row = await db.query.manualSubmissions.findFirst({
    where: eq(manualSubmissions.id, id),
    with: lookupWith,
  });
  return row ? toAdminManualSubmission(row, origin) : null;
};

const caseInsensitiveEq = (column: AnySQLiteColumn, value: string): SQL =>
  sql`lower(${column}) = lower(${value})`;

const normalizeName = (value: string): string => value.toLowerCase();

const requireSingleMatch = <T>(rows: T[], label: string): T => {
  if (rows.length === 0) {
    throw new HTTPException(409, {
      message: `${label} does not exist; create it before approving`,
    });
  }
  if (rows.length > 1) {
    throw new HTTPException(409, {
      message: `Multiple ${label.toLowerCase()} records match; resolve the duplicates before approving`,
    });
  }
  return rows[0];
};

const resolveLookups = async (db: Db, row: ManualSubmissionRow) => {
  const [departmentMatches, semesterMatches, examTypeMatches] = await Promise.all([
    db
      .select({
        id: departments.id,
        name: departments.name,
        shortName: departments.shortName,
      })
      .from(departments)
      .where(
        or(
          caseInsensitiveEq(departments.name, row.departmentName),
          caseInsensitiveEq(departments.shortName, row.departmentShortName),
        ),
      ),
    db
      .select({ id: semesters.id, name: semesters.name })
      .from(semesters)
      .where(caseInsensitiveEq(semesters.name, row.semesterName)),
    db
      .select({ id: examTypes.id, name: examTypes.name })
      .from(examTypes)
      .where(caseInsensitiveEq(examTypes.name, row.examTypeName)),
  ]);

  if (departmentMatches.length === 0) {
    throw new HTTPException(409, {
      message: "Department does not exist; create it before approving",
    });
  }
  const exactDepartmentMatches = departmentMatches.filter(
    (department) =>
      normalizeName(department.name) === normalizeName(row.departmentName) &&
      normalizeName(department.shortName) ===
        normalizeName(row.departmentShortName),
  );
  if (exactDepartmentMatches.length !== 1) {
    throw new HTTPException(409, {
      message:
        "Department name and short name do not identify one existing department",
    });
  }
  const department = exactDepartmentMatches[0];
  const semester = requireSingleMatch(semesterMatches, "Semester");
  const examType = requireSingleMatch(examTypeMatches, "Exam type");

  const courseMatches = await db
    .select({ id: courses.id, departmentId: courses.departmentId, name: courses.name })
    .from(courses)
    .where(
      and(
        eq(courses.departmentId, department.id),
        caseInsensitiveEq(courses.name, row.courseName),
      ),
    );
  const course = requireSingleMatch(courseMatches, "Course");

  return { department, course, semester, examType };
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
    departmentName,
    departmentShortName,
    courseName,
    semesterName,
    examTypeName,
  } = c.req.valid("query");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const filters: SQL[] = [];
  if (status) filters.push(eq(manualSubmissions.status, status));
  if (userId) filters.push(eq(manualSubmissions.userId, userId));
  if (departmentName)
    filters.push(
      caseInsensitiveEq(manualSubmissions.departmentName, departmentName),
    );
  if (departmentShortName)
    filters.push(
      caseInsensitiveEq(
        manualSubmissions.departmentShortName,
        departmentShortName,
      ),
    );
  if (courseName)
    filters.push(caseInsensitiveEq(manualSubmissions.courseName, courseName));
  if (semesterName)
    filters.push(
      caseInsensitiveEq(manualSubmissions.semesterName, semesterName),
    );
  if (examTypeName)
    filters.push(
      caseInsensitiveEq(manualSubmissions.examTypeName, examTypeName),
    );
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

  const resolved = await resolveLookups(db, row);
  const object = await c.env.BUCKET.get(row.pdfKey);
  if (!object) {
    throw new HTTPException(409, {
      message: "Manual submission PDF is missing from storage",
    });
  }

  const reviewerId = c.get("user").sub;
  const destinationKey = `submissions/${crypto.randomUUID()}.pdf`;
  await c.env.BUCKET.put(destinationKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  });

  const questionInsert = c.env.DB.prepare(
    `INSERT INTO questions (department_id, course_id, semester_id, exam_type_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (department_id, course_id, semester_id, exam_type_id) DO NOTHING`,
  ).bind(
    resolved.department.id,
    resolved.course.id,
    resolved.semester.id,
    resolved.examType.id,
  );

  const submissionInsert = c.env.DB.prepare(
    `INSERT INTO submissions
       (question_id, user_id, section, batch, pdf_key, file_size,
        watermarked_pdf_key, watermark_status, watermark_error)
     SELECT q.id, m.user_id, NULL, NULL, ?, ?, NULL, 'awaiting', NULL
     FROM manual_submissions AS m
     JOIN questions AS q
       ON q.department_id = ?
      AND q.course_id = ?
      AND q.semester_id = ?
      AND q.exam_type_id = ?
     WHERE m.id = ?
       AND m.status <> 'approved'
       AND NOT EXISTS (
         SELECT 1 FROM submissions AS s WHERE s.pdf_key = ?
       )`,
  ).bind(
    destinationKey,
    object.size,
    resolved.department.id,
    resolved.course.id,
    resolved.semester.id,
    resolved.examType.id,
    id,
    destinationKey,
  );

  const reviewUpdate = c.env.DB.prepare(
    `UPDATE manual_submissions
     SET status = 'approved',
         rejected_reason = NULL,
         reviewed_by = ?,
         pdf_key = ?,
         question_id = (
           SELECT q.id FROM questions AS q
           WHERE q.department_id = ?
             AND q.course_id = ?
             AND q.semester_id = ?
             AND q.exam_type_id = ?
         ),
         submission_id = (
           SELECT s.id FROM submissions AS s
           WHERE s.pdf_key = ?
             AND s.user_id = manual_submissions.user_id
           ORDER BY s.id DESC
           LIMIT 1
         )
     WHERE id = ? AND status <> 'approved'`,
  ).bind(
    reviewerId,
    destinationKey,
    resolved.department.id,
    resolved.course.id,
    resolved.semester.id,
    resolved.examType.id,
    destinationKey,
    id,
  );

  try {
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
  } catch (err) {
    // The database did not adopt the copied object. Keep the original manual
    // upload and remove the orphaned destination copy.
    await deletePdf(c.env.BUCKET, destinationKey);
    throw err;
  }

  // D1 now points both records at the normal submission key. Removing the old
  // object completes the move; a cleanup failure only leaves a harmless copy.
  await deletePdf(c.env.BUCKET, row.pdfKey);

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

  // Watermark the submission the approval just created (status: awaiting).
  if (detail.submissionId !== null) {
    await startWatermark(c.env, detail.submissionId);
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
