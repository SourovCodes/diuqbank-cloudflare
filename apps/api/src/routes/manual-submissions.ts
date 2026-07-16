import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import {
  manualSubmissions,
  type ManualSubmission as ManualSubmissionRow,
} from "../db/schema";
import { buildMeta } from "../shared/utils/pagination";
import type { ManualSubmission } from "../shared/types";
import { deleteObject } from "../lib/manual-submission";
import { parseId } from "../lib/parse-id";
import { parsePdfFile, pdfUploadBodyLimit } from "../lib/pdf-upload";
import { enforceRateLimit } from "../lib/rate-limit";
import { fileUrlFor } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import {
  manualSubmissionCreateForm,
  manualSubmissionsListQuery,
} from "../shared/schemas/manual-submissions";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

const toManualSubmission = (row: ManualSubmissionRow): ManualSubmission => ({
  id: row.id,
  status: row.status,
  departmentName: row.departmentName,
  courseName: row.courseName,
  semesterName: row.semesterName,
  examTypeName: row.examTypeName,
  section: row.section,
  batch: row.batch,
  rejectedReason: row.rejectedReason,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(row.pdfKey),
  createdAt: row.createdAt,
});

route.get("/", validate("query", manualSubmissionsListQuery), async (c) => {
  const { page, perPage } = c.req.valid("query");
  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const where = eq(manualSubmissions.userId, userId);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.manualSubmissions.findMany({
      where,
      orderBy: [desc(manualSubmissions.createdAt), desc(manualSubmissions.id)],
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    db.select({ value: count() }).from(manualSubmissions).where(where),
  ]);

  return c.json({
    data: items.map((item) => toManualSubmission(item)),
    meta: buildMeta(page, perPage, total),
  });
});

route.post(
  "/",
  pdfUploadBodyLimit,
  validate("form", manualSubmissionCreateForm),
  async (c) => {
    const { departmentName, courseName, semesterName, examTypeName, section, batch } =
      c.req.valid("form");
    const userId = c.get("user").sub;
    // Cap per-user upload rate before touching R2.
    await enforceRateLimit(c.env.SUBMISSION_UPLOAD_RATE_LIMITER, `user:${userId}`);
    const body = await c.req.parseBody();
    const pdf = await parsePdfFile(body["pdf"]);
    const db = getDb(c.env.DB);

    const key = `manual-submissions/${crypto.randomUUID()}.pdf`;
    await c.env.BUCKET.put(key, pdf.buffer, {
      httpMetadata: { contentType: pdf.contentType },
    });

    let created: ManualSubmissionRow | undefined;
    try {
      [created] = await db
        .insert(manualSubmissions)
        .values({
          userId,
          pdfKey: key,
          fileSize: pdf.buffer.byteLength,
          departmentName,
          courseName,
          semesterName,
          examTypeName,
          section: section || null,
          batch: batch || null,
        })
        .returning();
    } catch (err) {
      await deleteObject(c.env.BUCKET, key);
      throw err;
    }

    return c.json(toManualSubmission(created), 201);
  },
);

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const row = await db.query.manualSubmissions.findFirst({
    where: and(eq(manualSubmissions.id, id), eq(manualSubmissions.userId, userId)),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Submission not found" });
  }
  return c.json(toManualSubmission(row));
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ pdfKey: manualSubmissions.pdfKey, status: manualSubmissions.status })
    .from(manualSubmissions)
    .where(and(eq(manualSubmissions.id, id), eq(manualSubmissions.userId, userId)))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Submission not found" });
  }
  if (row.status === "published") {
    throw new HTTPException(409, {
      message: "Published submissions cannot be deleted by users",
    });
  }

  await db
    .delete(manualSubmissions)
    .where(and(eq(manualSubmissions.id, id), eq(manualSubmissions.userId, userId)));
  await deleteObject(c.env.BUCKET, row.pdfKey);

  return c.body(null, 204);
});

export default route;
