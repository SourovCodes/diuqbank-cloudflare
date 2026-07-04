import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";

import { getDb } from "../../db/client";
import { autoSubmissions, manualSubmissions, submissions } from "../../db/schema";
import {
  invalidateSubmission,
  invalidateSubmissionEdit,
  invalidateSubmissionMove,
  invalidateSubmissionView,
} from "../../lib/cache";
import { toAdminSubmission, toAdminSubmissionDetail } from "../../lib/admin-shape";
import { buildMeta } from "../../shared/utils/pagination";
import { parseId } from "../../lib/parse-id";
import { startWatermark } from "../../lib/pdf-processor";
import { parsePdfFile, pdfUploadBodyLimit } from "../../lib/pdf-upload";
import { validate } from "../../lib/validator";
import {
  submissionCreateForm,
  submissionsListQuery,
  submissionUpdateSchema,
  submissionViewIncrementSchema,
} from "../../shared/schemas/admin/submissions";
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

  // The source auto/manual submission (if this submission was published from
  // one) so the admin UI can link back to the review record.
  const [row, autoSource, manualSource] = await Promise.all([
    db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      with: submissionWith,
    }),
    db.query.autoSubmissions.findFirst({
      where: eq(autoSubmissions.submissionId, id),
      columns: { id: true },
    }),
    db.query.manualSubmissions.findFirst({
      where: eq(manualSubmissions.submissionId, id),
      columns: { id: true },
    }),
  ]);
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  return c.json(toAdminSubmissionDetail(row, origin, {
    autoSubmissionId: autoSource?.id ?? null,
    manualSubmissionId: manualSource?.id ?? null,
  }));
});

// Multipart: `pdf` file + text fields (validated by `submissionCreateForm`).
route.post("/", pdfUploadBodyLimit, validate("form", submissionCreateForm), async (c) => {
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

  // Kick off watermarking (awaiting → completed/failed) in the background.
  await startWatermark(c.env, created.id);

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, created.id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(500, { message: "Failed to load created submission" });

  if (row.user) {
    c.executionCtx.waitUntil(
      invalidateSubmission(c.env, row.question.id, row.user.username),
    );
  }

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
  const previous = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    columns: { questionId: true },
    with: { user: { columns: { username: true } } },
  });
  if (!previous) throw new HTTPException(404, { message: "Submission not found" });

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

  if (row.user && previous.user) {
    const invalidation =
      previous.questionId !== row.question.id ||
      previous.user.username !== row.user.username
        ? invalidateSubmissionMove(
            c.env,
            { questionId: previous.questionId, username: previous.user.username },
            { questionId: row.question.id, username: row.user.username },
          )
        : invalidateSubmissionEdit(c.env, row.question.id, row.user.username);
    c.executionCtx.waitUntil(invalidation);
  }

  return c.json(toAdminSubmission(row, origin));
});

// Increment a submission's view count. The parent question's `view_count` (a
// summed running total) is kept in sync by an AFTER UPDATE trigger on
// `submissions`. The body is optional: `{ by?: number }` defaults to +1.
route.post("/:id/views", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  // A bare POST means +1. Parse defensively so a missing/empty body doesn't 400
  // the way `validate("json", …)` would on an absent JSON payload.
  const raw = await c.req.json().catch(() => ({}));
  const parsed = submissionViewIncrementSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      field: issue.path.length ? issue.path.join(".") : "(root)",
      message: issue.message,
    }));
    return c.json({ error: "Validation failed", issues }, 400);
  }
  const by = parsed.data.by ?? 1;

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  // Atomic bump (no read-modify-write race); the AFTER UPDATE OF view_count
  // trigger adjusts the question's summed view_count.
  const [updated] = await db
    .update(submissions)
    .set({ viewCount: sql`${submissions.viewCount} + ${by}` })
    .where(eq(submissions.id, id))
    .returning({ id: submissions.id });
  if (!updated) throw new HTTPException(404, { message: "Submission not found" });

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  if (row.user) {
    c.executionCtx.waitUntil(
      invalidateSubmissionView(c.env, row.question.id, row.user.username),
    );
  }

  return c.json(toAdminSubmission(row, origin));
});

// Replace the PDF. A new file resets watermarking (status → awaiting, old
// watermarked object cleared).
route.put("/:id/pdf", pdfUploadBodyLimit, async (c) => {
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

  // Re-run watermarking against the replacement PDF.
  await startWatermark(c.env, id);

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: submissionWith,
  });
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  if (row.user) {
    c.executionCtx.waitUntil(
      invalidateSubmissionEdit(c.env, row.question.id, row.user.username),
    );
  }

  return c.json(toAdminSubmission(row, origin));
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) throw new HTTPException(404, { message: "Submission not found" });

  const db = getDb(c.env.DB);
  // Pull the question + contributor too, so we can target cache invalidation
  // before the row is gone.
  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, id),
    columns: {
      questionId: true,
      pdfKey: true,
      watermarkedPdfKey: true,
    },
    with: { user: { columns: { username: true } } },
  });
  if (!row) throw new HTTPException(404, { message: "Submission not found" });

  const [{ value: manualSubmissionCount }] = await db
    .select({ value: count() })
    .from(manualSubmissions)
    .where(eq(manualSubmissions.submissionId, id));
  if (manualSubmissionCount > 0) {
    throw new HTTPException(409, {
      message: `Cannot delete: ${manualSubmissionCount} approved manual submission(s) reference this submission`,
    });
  }

  await db.delete(submissions).where(eq(submissions.id, id));

  // Best-effort R2 cleanup after the row is gone.
  await deleteObjects(c.env.BUCKET, [row.pdfKey, row.watermarkedPdfKey]);

  if (row.user) {
    c.executionCtx.waitUntil(
      invalidateSubmission(c.env, row.questionId, row.user.username),
    );
  }

  return c.body(null, 204);
});

export default route;
