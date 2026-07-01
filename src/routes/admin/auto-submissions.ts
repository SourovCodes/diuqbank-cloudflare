import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { getDb, type Db } from "../../db/client";
import {
  autoSubmissions,
  type AutoSubmission,
  type User,
} from "../../db/schema";
import { buildMeta } from "../../shared/utils/pagination";
import type { AdminAutoSubmission } from "../../shared/types";
import {
  publishAutoSubmission,
  startAutoSubmission,
} from "../../lib/auto-submission";
import { parseId } from "../../lib/parse-id";
import { fileUrlFor, toAuthUser } from "../../lib/user-shape";
import { validate } from "../../lib/validator";
import {
  adminAutoSubmissionRejectSchema,
  adminAutoSubmissionsListQuery,
  adminAutoSubmissionUpdateSchema,
} from "../../shared/schemas/admin/auto-submissions";
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
} as const;

type EmbeddedUser = Pick<
  User,
  "id" | "name" | "email" | "username" | "role" | "imageKey" | "createdAt"
>;

type AdminAutoSubmissionRow = AutoSubmission & {
  user: EmbeddedUser;
  reviewer: EmbeddedUser | null;
};

const toAdminAutoSubmission = (
  row: AdminAutoSubmissionRow,
  origin: string,
): AdminAutoSubmission => ({
  id: row.id,
  userId: row.userId,
  legacyId: row.legacyId,
  contributor: toAuthUser(row.user, origin),
  status: row.status,
  isAcceptable: row.isAcceptable,
  aiReasoning: row.aiReasoning,
  departmentName: row.extractedDepartmentName,
  departmentShortName: row.extractedDepartmentShortName,
  courseName: row.extractedCourseName,
  semesterName: row.extractedSemesterName,
  examTypeName: row.extractedExamTypeName,
  section: row.section,
  batch: row.batch,
  extraContext: row.extraContext,
  fileSize: row.fileSize,
  processingError: row.processingError,
  rejectedReason: row.rejectedReason,
  reviewedBy: row.reviewedBy,
  reviewer: row.reviewer ? toAuthUser(row.reviewer, origin) : null,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  createdAt: row.createdAt,
});

const loadAutoSubmission = async (db: Db, id: number, origin: string) => {
  const row = await db.query.autoSubmissions.findFirst({
    where: eq(autoSubmissions.id, id),
    with: lookupWith,
  });
  return row ? toAdminAutoSubmission(row, origin) : null;
};

route.get("/", validate("query", adminAutoSubmissionsListQuery), async (c) => {
  const { page, perPage, status, userId } = c.req.valid("query");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const filters: SQL[] = [];
  if (status) filters.push(eq(autoSubmissions.status, status));
  if (userId) filters.push(eq(autoSubmissions.userId, userId));
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.autoSubmissions.findMany({
      where,
      with: lookupWith,
      orderBy: [desc(autoSubmissions.createdAt), desc(autoSubmissions.id)],
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    db.select({ value: count() }).from(autoSubmissions).where(where),
  ]);

  return c.json({
    data: items.map((item) => toAdminAutoSubmission(item, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const detail = await loadAutoSubmission(
    getDb(c.env.DB),
    id,
    new URL(c.req.url).origin,
  );
  if (!detail) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  return c.json(detail);
});

route.patch(
  "/:id",
  validate("json", adminAutoSubmissionUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }

    const input = c.req.valid("json");
    if (Object.keys(input).length === 0) {
      throw new HTTPException(400, { message: "No fields to update" });
    }

    const db = getDb(c.env.DB);
    const [existing] = await db
      .select({ status: autoSubmissions.status })
      .from(autoSubmissions)
      .where(eq(autoSubmissions.id, id))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }
    if (existing.status === "published") {
      throw new HTTPException(409, {
        message: "Published auto submissions cannot be edited",
      });
    }

    // Map the editable form fields onto the extracted_* snapshot columns.
    // section/batch may be cleared by sending an empty string.
    const update: Partial<typeof autoSubmissions.$inferInsert> = {};
    if (input.departmentName !== undefined)
      update.extractedDepartmentName = input.departmentName;
    if (input.departmentShortName !== undefined)
      update.extractedDepartmentShortName = input.departmentShortName;
    if (input.courseName !== undefined)
      update.extractedCourseName = input.courseName;
    if (input.semesterName !== undefined)
      update.extractedSemesterName = input.semesterName;
    if (input.examTypeName !== undefined)
      update.extractedExamTypeName = input.examTypeName;
    if (input.section !== undefined) update.section = input.section || null;
    if (input.batch !== undefined) update.batch = input.batch || null;

    await db
      .update(autoSubmissions)
      .set(update)
      .where(eq(autoSubmissions.id, id));

    const detail = await loadAutoSubmission(db, id, new URL(c.req.url).origin);
    if (!detail) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }
    return c.json(detail);
  },
);

route.post("/:id/approve", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const db = getDb(c.env.DB);
  const [existing] = await db
    .select({ status: autoSubmissions.status })
    .from(autoSubmissions)
    .where(eq(autoSubmissions.id, id))
    .limit(1);
  if (!existing) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  if (existing.status === "published") {
    throw new HTTPException(409, {
      message: "Auto submission is already published",
    });
  }

  const submissionId = await publishAutoSubmission(
    c.env,
    db,
    id,
    c.get("user").sub,
  );
  if (submissionId === null) {
    throw new HTTPException(409, {
      message: "Auto submission could not be approved",
    });
  }

  // publishAutoSubmission busts the relevant caches (taxonomy + submission).
  const detail = await loadAutoSubmission(db, id, new URL(c.req.url).origin);
  if (!detail) {
    throw new HTTPException(500, {
      message: "Failed to load approved auto submission",
    });
  }

  return c.json(detail);
});

route.post("/:id/reprocess", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  // Race-safe: only a terminally `failed` row can be reset. Clearing
  // is_acceptable forces a fresh Gemini run (runAutoExtraction reuses the
  // snapshot when it's already set).
  const reset = await c.env.DB.prepare(
    `UPDATE auto_submissions
     SET status = 'processing', processing_error = NULL, is_acceptable = NULL
     WHERE id = ? AND status = 'failed'`,
  )
    .bind(id)
    .run();
  if ((reset.meta.changes ?? 0) === 0) {
    throw new HTTPException(409, {
      message: "Only failed auto submissions can be reprocessed",
    });
  }

  // Re-enqueue on the throttled queue (self-marks failed if the enqueue throws).
  await startAutoSubmission(c.env, id);

  const detail = await loadAutoSubmission(
    getDb(c.env.DB),
    id,
    new URL(c.req.url).origin,
  );
  if (!detail) {
    throw new HTTPException(500, {
      message: "Failed to load reprocessed auto submission",
    });
  }
  return c.json(detail);
});

route.post(
  "/:id/reject",
  validate("json", adminAutoSubmissionRejectSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }

    const { reason } = c.req.valid("json");
    const db = getDb(c.env.DB);
    const [existing] = await db
      .select({ status: autoSubmissions.status })
      .from(autoSubmissions)
      .where(eq(autoSubmissions.id, id))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }
    if (existing.status === "published") {
      throw new HTTPException(409, {
        message: "Published auto submissions cannot be rejected",
      });
    }

    await db
      .update(autoSubmissions)
      .set({
        status: "rejected",
        rejectedReason: reason,
        reviewedBy: c.get("user").sub,
        questionId: null,
        submissionId: null,
      })
      .where(eq(autoSubmissions.id, id));

    const detail = await loadAutoSubmission(db, id, new URL(c.req.url).origin);
    if (!detail) {
      throw new HTTPException(500, {
        message: "Failed to load rejected auto submission",
      });
    }
    return c.json(detail);
  },
);

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ pdfKey: autoSubmissions.pdfKey, status: autoSubmissions.status })
    .from(autoSubmissions)
    .where(eq(autoSubmissions.id, id))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  await db.delete(autoSubmissions).where(eq(autoSubmissions.id, id));
  // The published live submission has its own copied PDF, so removing the
  // original upload here is safe even for published rows.
  try {
    await c.env.BUCKET.delete(row.pdfKey);
  } catch (err) {
    console.error("R2 delete failed for auto submission PDF", row.pdfKey, err);
  }
  return c.body(null, 204);
});

export default route;
