import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { manualSubmissions, type ManualSubmission } from "../db/schema";
import { buildMeta } from "../shared/utils/pagination";
import { parseId } from "../lib/parse-id";
import { parsePdfFile } from "../lib/pdf-upload";
import { fileUrlFor } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import {
  manualSubmissionCreateForm,
  manualSubmissionsListQuery,
} from "../shared/schemas/manual-submissions";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

const toManualSubmission = (
  row: ManualSubmission,
  origin: string,
) => ({
  id: row.id,
  userId: row.userId,
  department: {
    id: row.departmentId,
    name: row.departmentName,
    shortName: row.departmentShortName,
  },
  course: {
    id: row.courseId,
    departmentId: row.departmentId,
    name: row.courseName,
  },
  semester: { id: row.semesterId, name: row.semesterName },
  examType: { id: row.examTypeId, name: row.examTypeName },
  note: row.note,
  status: row.status,
  rejectedReason: row.rejectedReason,
  reviewedBy: row.reviewedBy,
  questionId: row.questionId,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  createdAt: row.createdAt,
});

const deletePdf = async (bucket: R2Bucket, key: string): Promise<void> => {
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed for manual submission PDF", key, err);
  }
};

route.get("/", validate("query", manualSubmissionsListQuery), async (c) => {
  const { page, perPage } = c.req.valid("query");
  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;
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
    data: items.map((item) => toManualSubmission(item, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.post(
  "/",
  rateLimit((env) => env.AUTH_RATELIMIT),
  validate("form", manualSubmissionCreateForm),
  async (c) => {
    const {
      departmentName,
      departmentShortName,
      courseName,
      semesterName,
      examTypeName,
      note,
    } = c.req.valid("form");
    const body = await c.req.parseBody();
    const pdf = await parsePdfFile(body["pdf"]);
    const userId = c.get("user").sub;
    const db = getDb(c.env.DB);
    const origin = new URL(c.req.url).origin;

    const key = `manual-submissions/${crypto.randomUUID()}.pdf`;
    await c.env.BUCKET.put(key, pdf.buffer, {
      httpMetadata: { contentType: pdf.contentType },
    });

    let created: { id: number } | undefined;
    try {
      [created] = await db
        .insert(manualSubmissions)
        .values({
          userId,
          departmentName,
          departmentShortName,
          courseName,
          semesterName,
          examTypeName,
          note: note ?? null,
          pdfKey: key,
        })
        .returning({ id: manualSubmissions.id });
    } catch (err) {
      await deletePdf(c.env.BUCKET, key);
      throw err;
    }

    const row = await db.query.manualSubmissions.findFirst({
      where: eq(manualSubmissions.id, created.id),
    });
    if (!row) {
      throw new HTTPException(500, {
        message: "Failed to load created manual submission",
      });
    }

    return c.json(toManualSubmission(row, origin), 201);
  },
);

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const row = await db.query.manualSubmissions.findFirst({
    where: and(
      eq(manualSubmissions.id, id),
      eq(manualSubmissions.userId, userId),
    ),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  return c.json(toManualSubmission(row, new URL(c.req.url).origin));
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const [row] = await db
    .select({
      pdfKey: manualSubmissions.pdfKey,
      status: manualSubmissions.status,
    })
    .from(manualSubmissions)
    .where(and(eq(manualSubmissions.id, id), eq(manualSubmissions.userId, userId)))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  if (row.status === "approved") {
    throw new HTTPException(409, {
      message: "Approved manual submissions cannot be deleted by users",
    });
  }

  await db
    .delete(manualSubmissions)
    .where(and(eq(manualSubmissions.id, id), eq(manualSubmissions.userId, userId)));
  await deletePdf(c.env.BUCKET, row.pdfKey);

  return c.body(null, 204);
});

export default route;
