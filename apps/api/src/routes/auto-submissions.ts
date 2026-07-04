import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { autoSubmissions, type AutoSubmission as AutoSubmissionRow } from "../db/schema";
import { buildMeta } from "../shared/utils/pagination";
import type { AutoSubmission } from "../shared/types";
import { startAutoSubmission } from "../lib/auto-submission";
import { parseId } from "../lib/parse-id";
import { parsePdfFile, pdfUploadBodyLimit } from "../lib/pdf-upload";
import { enforceRateLimit } from "../lib/rate-limit";
import { fileUrlFor } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import {
  autoSubmissionCreateForm,
  autoSubmissionsListQuery,
} from "../shared/schemas/auto-submissions";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

const toAutoSubmission = (
  row: AutoSubmissionRow,
  origin: string,
): AutoSubmission => ({
  id: row.id,
  status: row.status,
  isAcceptable: row.isAcceptable,
  aiReasoning: row.aiReasoning,
  departmentName: row.extractedDepartmentName,
  courseName: row.extractedCourseName,
  semesterName: row.extractedSemesterName,
  examTypeName: row.extractedExamTypeName,
  section: row.section,
  batch: row.batch,
  extraContext: row.extraContext,
  rejectedReason: row.rejectedReason,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  createdAt: row.createdAt,
});

const deletePdf = async (bucket: R2Bucket, key: string): Promise<void> => {
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed for auto submission PDF", key, err);
  }
};

route.get("/", validate("query", autoSubmissionsListQuery), async (c) => {
  const { page, perPage } = c.req.valid("query");
  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;
  const where = eq(autoSubmissions.userId, userId);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.autoSubmissions.findMany({
      where,
      orderBy: [desc(autoSubmissions.createdAt), desc(autoSubmissions.id)],
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    db.select({ value: count() }).from(autoSubmissions).where(where),
  ]);

  return c.json({
    data: items.map((item) => toAutoSubmission(item, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.post(
  "/",
  pdfUploadBodyLimit,
  validate("form", autoSubmissionCreateForm),
  async (c) => {
    const { extraContext } = c.req.valid("form");
    const userId = c.get("user").sub;
    // Cap per-user upload rate before touching R2 or the paid Gemini path.
    await enforceRateLimit(c.env.AUTO_SUBMISSION_RATE_LIMITER, `user:${userId}`);
    const body = await c.req.parseBody();
    const pdf = await parsePdfFile(body["pdf"]);
    const db = getDb(c.env.DB);
    const origin = new URL(c.req.url).origin;

    const key = `auto-submissions/${crypto.randomUUID()}.pdf`;
    await c.env.BUCKET.put(key, pdf.buffer, {
      httpMetadata: { contentType: pdf.contentType },
    });

    let created: { id: number } | undefined;
    try {
      [created] = await db
        .insert(autoSubmissions)
        .values({
          userId,
          pdfKey: key,
          fileSize: pdf.buffer.byteLength,
          extraContext: extraContext ?? null,
        })
        .returning({ id: autoSubmissions.id });
    } catch (err) {
      await deletePdf(c.env.BUCKET, key);
      throw err;
    }

    // Kick off AI processing (compress → Gemini → publish/route) on the
    // throttled queue. Never throws; flips the row to `failed` on enqueue error.
    await startAutoSubmission(c.env, created.id);

    const row = await db.query.autoSubmissions.findFirst({
      where: eq(autoSubmissions.id, created.id),
    });
    if (!row) {
      throw new HTTPException(500, {
        message: "Failed to load created auto submission",
      });
    }

    return c.json(toAutoSubmission(row, origin), 201);
  },
);

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const row = await db.query.autoSubmissions.findFirst({
    where: and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  return c.json(toAutoSubmission(row, new URL(c.req.url).origin));
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ pdfKey: autoSubmissions.pdfKey, status: autoSubmissions.status })
    .from(autoSubmissions)
    .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  if (row.status === "published") {
    throw new HTTPException(409, {
      message: "Published auto submissions cannot be deleted by users",
    });
  }

  await db
    .delete(autoSubmissions)
    .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)));
  await deletePdf(c.env.BUCKET, row.pdfKey);

  return c.body(null, 204);
});

export default route;
