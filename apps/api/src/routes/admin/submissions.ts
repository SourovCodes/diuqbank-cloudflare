import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { getDb } from "../../db/client";
import { submissions } from "../../db/schema";
import { toAdminSubmission } from "../../lib/admin-shape";
import { buildMeta } from "../../lib/pagination";
import { parseId } from "../../lib/parse-id";
import { parsePdfFile } from "../../lib/pdf-upload";
import { validate } from "../../lib/validator";
import {
  submissionCreateForm,
  submissionsListQuery,
  submissionUpdateSchema,
} from "../../schemas/admin/submissions";
import type { AppEnv } from "../../types";

const route = new Hono<AppEnv>();

// Eager-load shape backing `toAdminSubmission`: the parent question (id + the
// entities needed to build its title) and the contributor.
const submissionWith = {
  question: {
    columns: { id: true },
    with: {
      department: { columns: { shortName: true } },
      course: { columns: { name: true } },
      semester: { columns: { name: true } },
      examType: { columns: { name: true } },
    },
  },
  user: { columns: { id: true, name: true, username: true, imageKey: true } },
} as const;

// Best-effort delete of stored objects; never fail the request on cleanup.
const deleteObjects = async (
  bucket: R2Bucket,
  keys: (string | null)[],
): Promise<void> => {
  for (const key of keys) {
    if (!key) continue;
    try {
      await bucket.delete(key);
    } catch (err) {
      console.error("R2 delete failed for submission file", key, err);
    }
  }
};

route.get("/", validate("query", submissionsListQuery), async (c) => {
  const { page, perPage, questionId, userId, watermarkStatus } =
    c.req.valid("query");
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const filters: SQL[] = [];
  if (questionId) filters.push(eq(submissions.questionId, questionId));
  if (userId) filters.push(eq(submissions.userId, userId));
  if (watermarkStatus)
    filters.push(eq(submissions.watermarkStatus, watermarkStatus));
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.submissions.findMany({
      where,
      with: submissionWith,
      orderBy: desc(submissions.createdAt),
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    db.select({ value: count() }).from(submissions).where(where),
  ]);

  return c.json({
    data: items.map((s) => toAdminSubmission(s, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.get("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  return c.json(toAdminSubmission(row, origin));
});

// Multipart: `pdf` file + text fields (validated by `submissionCreateForm`).
route.post("/", validate("form", submissionCreateForm), async (c) => {
  const { questionId, userId, section, batch } = c.req.valid("form");
  const body = await c.req.parseBody();
  const pdf = await parsePdfFile(body["pdf"]);

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const key = `submissions/${crypto.randomUUID()}.pdf`;
  await c.env.BUCKET.put(key, pdf.buffer, {
    httpMetadata: { contentType: pdf.contentType },
  });

  let created;
  try {
    [created] = await db
      .insert(submissions)
      .values({
        questionId,
        userId,
        section: section ?? null,
        batch: batch ?? null,
        pdfKey: key,
        fileSize: pdf.buffer.byteLength,
        watermarkStatus: "awaiting",
      })
      .returning({ id: submissions.id });
  } catch (err) {
    // DB insert failed — don't leave an orphan object in R2.
    await deleteObjects(c.env.BUCKET, [key]);
    throw err;
  }

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, created.id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(500, { message: "Failed to load created submission" });

  return c.json(toAdminSubmission(row, origin), 201);
});

route.patch("/:id", validate("json", submissionUpdateSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  const input = c.req.valid("json");
  if (Object.keys(input).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const [updated] = await db
    .update(submissions)
    .set(input)
    .where(eq(submissions.id, id))
    .returning({ id: submissions.id });
  if (!updated) throw new HTTPException(404, { message: "Submission not found" });

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  return c.json(toAdminSubmission(row, origin));
});

// Replace the PDF. A new file resets watermarking (status → awaiting, old
// watermarked object cleared).
route.put("/:id/pdf", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const body = await c.req.parseBody();
  const pdf = await parsePdfFile(body["pdf"]);

  const [prev] = await db
    .select({
      pdfKey: submissions.pdfKey,
      watermarkedPdfKey: submissions.watermarkedPdfKey,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!prev) throw new HTTPException(404, { message: "Submission not found" });

  const key = `submissions/${crypto.randomUUID()}.pdf`;
  await c.env.BUCKET.put(key, pdf.buffer, {
    httpMetadata: { contentType: pdf.contentType },
  });

  try {
    await db
      .update(submissions)
      .set({
        pdfKey: key,
        fileSize: pdf.buffer.byteLength,
        watermarkedPdfKey: null,
        watermarkStatus: "awaiting",
        watermarkError: null,
      })
      .where(eq(submissions.id, id));
  } catch (err) {
    await deleteObjects(c.env.BUCKET, [key]);
    throw err;
  }

  // Best-effort delete of the previous objects after a successful swap.
  await deleteObjects(c.env.BUCKET, [
    prev.pdfKey === key ? null : prev.pdfKey,
    prev.watermarkedPdfKey,
  ]);

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  return c.json(toAdminSubmission(row, origin));
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  const db = getDb(c.env.DB);
  const [row] = await db
    .select({
      pdfKey: submissions.pdfKey,
      watermarkedPdfKey: submissions.watermarkedPdfKey,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  await db.delete(submissions).where(eq(submissions.id, id));

  // Best-effort R2 cleanup after the row is gone.
  await deleteObjects(c.env.BUCKET, [row.pdfKey, row.watermarkedPdfKey]);

  return c.body(null, 204);
});

export default route;
