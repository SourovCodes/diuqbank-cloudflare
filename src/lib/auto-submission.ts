import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { getDb, type Db } from "../db/client";
import { autoSubmissions } from "../db/schema";
import type { Bindings } from "../types";
import {
  buildVocab,
  extractQuestionMetadata,
  type AiExtraction,
} from "./ai-extraction";
import { compressPdf, startWatermark } from "./pdf-processor";
import {
  findOrCreateCourse,
  findOrCreateDepartment,
  findOrCreateExamType,
  findOrCreateQuestion,
  findOrCreateSemester,
} from "./taxonomy";

/**
 * Enqueue an auto-submission for AI processing on the throttled `PDF_QUEUE`
 * (see `runAutoExtraction`). Never throws: if the enqueue fails, the row is
 * flipped to `failed` so it isn't silently stranded at `processing`.
 */
export const startAutoSubmission = async (
  env: Bindings,
  autoSubmissionId: number,
): Promise<void> => {
  try {
    await env.PDF_QUEUE.send({ kind: "ai-submission", autoSubmissionId });
  } catch (err) {
    console.error("PDF_QUEUE.send(ai-submission) failed", autoSubmissionId, err);
    const message =
      err instanceof Error ? err.message : "Failed to start AI processing";
    await markAutoFailed(env, autoSubmissionId, message);
  }
};

/** Flag an auto-submission as terminally failed. Only flips a still-processing
 * row, so it never clobbers a row that has already reached a terminal state. */
export const markAutoFailed = async (
  env: Bindings,
  autoSubmissionId: number,
  message: string,
): Promise<void> => {
  try {
    await getDb(env.DB)
      .update(autoSubmissions)
      .set({ status: "failed", processingError: message.slice(0, 1000) })
      .where(
        and(
          eq(autoSubmissions.id, autoSubmissionId),
          eq(autoSubmissions.status, "processing"),
        ),
      );
  } catch (err) {
    console.error("Failed to mark auto submission failed", autoSubmissionId, err);
  }
};

/** True only when the model accepted the paper AND gave us every field needed
 * to create a question. Anything short of this goes to admin review. */
const isConfident = (e: {
  isAcceptable: boolean | null;
  extractedDepartmentName: string | null;
  extractedDepartmentShortName: string | null;
  extractedCourseName: string | null;
  extractedSemesterName: string | null;
  extractedExamTypeName: string | null;
}): boolean =>
  e.isAcceptable === true &&
  !!e.extractedDepartmentName &&
  !!e.extractedDepartmentShortName &&
  !!e.extractedCourseName &&
  !!e.extractedSemesterName &&
  !!e.extractedExamTypeName;

/**
 * Process one auto-submission: compress → Gemini extract → route. Run by the
 * `PDF_QUEUE` consumer. Idempotent on `status`: a row already past `processing`
 * is a no-op, and a redelivery that already has an extraction snapshot skips the
 * (paid) Gemini call and re-routes from stored fields. Throws on failure so the
 * consumer can retry; the consumer marks the row `failed` once retries run out.
 */
export const runAutoExtraction = async (
  env: Bindings,
  autoSubmissionId: number,
): Promise<void> => {
  const db = getDb(env.DB);

  const row = await db.query.autoSubmissions.findFirst({
    where: eq(autoSubmissions.id, autoSubmissionId),
  });
  if (!row) return; // deleted between enqueue and run
  if (row.status !== "processing") return; // already handled

  // Reuse a prior extraction snapshot if a redelivery already produced one, so
  // we don't pay for Gemini twice.
  let snapshot = row;
  if (row.isAcceptable === null) {
    const original = await env.BUCKET.get(row.pdfKey);
    if (!original) throw new Error("Uploaded PDF missing from storage");

    const compressed = await compressPdf(env, await original.arrayBuffer());
    const vocab = await buildVocab(db);
    const extraction = await extractQuestionMetadata({
      env,
      pdfBuffer: compressed,
      vocab,
      extraContext: row.extraContext,
    });

    const update = snapshotFields(extraction);
    await db
      .update(autoSubmissions)
      .set(update)
      .where(
        and(
          eq(autoSubmissions.id, autoSubmissionId),
          eq(autoSubmissions.status, "processing"),
        ),
      );
    snapshot = { ...row, ...update };
  }

  if (isConfident(snapshot)) {
    await publishAutoSubmission(env, db, autoSubmissionId, null);
  } else {
    await db
      .update(autoSubmissions)
      .set({ status: "needs_review" })
      .where(
        and(
          eq(autoSubmissions.id, autoSubmissionId),
          eq(autoSubmissions.status, "processing"),
        ),
      );
  }
};

/** Map a Gemini extraction onto the auto_submissions snapshot columns. */
const snapshotFields = (e: AiExtraction) => ({
  isAcceptable: e.isAcceptable,
  // Keep the model's reasoning; on rejection prefer the concrete reason.
  aiReasoning: e.isAcceptable ? e.reasoning : e.rejectionReason ?? e.reasoning,
  extractedDepartmentName: e.departmentName,
  extractedDepartmentShortName: e.departmentShortName,
  extractedCourseName: e.courseName,
  extractedSemesterName: e.semesterName,
  extractedExamTypeName: e.examTypeName,
  section: e.section,
  batch: e.batch,
});

/**
 * Turn an accepted/approved auto-submission into a live `submission`. Reuses the
 * race-safe taxonomy find-or-create (so the AI can introduce new departments/
 * courses), copies the PDF into the `submissions/` namespace, then atomically
 * creates the submission and links the auto row — all gated on the row not being
 * `published`, so a redelivery or double-approve can't create duplicates.
 *
 * Returns the new submission id, or `null` when the row was already published
 * (no-op). Shared by the queue consumer (auto-publish) and the admin approve
 * route; `reviewerId` is the approving admin, or `null` for auto-publish.
 */
export const publishAutoSubmission = async (
  env: Bindings,
  db: Db,
  autoSubmissionId: number,
  reviewerId: number | null,
): Promise<number | null> => {
  const row = await db.query.autoSubmissions.findFirst({
    where: eq(autoSubmissions.id, autoSubmissionId),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  if (row.status === "published") return null;
  if (
    !row.extractedDepartmentName ||
    !row.extractedDepartmentShortName ||
    !row.extractedCourseName ||
    !row.extractedSemesterName ||
    !row.extractedExamTypeName
  ) {
    throw new HTTPException(400, {
      message:
        "Fill in department, course, semester and exam type before approving",
    });
  }

  const departmentId = await findOrCreateDepartment(
    db,
    row.extractedDepartmentName,
    row.extractedDepartmentShortName,
  );
  const courseId = await findOrCreateCourse(db, departmentId, row.extractedCourseName);
  const semesterId = await findOrCreateSemester(db, row.extractedSemesterName);
  const examTypeId = await findOrCreateExamType(db, row.extractedExamTypeName);
  const questionId = await findOrCreateQuestion(db, {
    departmentId,
    courseId,
    semesterId,
    examTypeId,
  });

  const object = await env.BUCKET.get(row.pdfKey);
  if (!object) {
    throw new HTTPException(409, {
      message: "Uploaded PDF is missing from storage",
    });
  }

  // Copy into the submissions namespace so the live submission's file lifecycle
  // is independent of the auto-submission record (which the user keeps).
  const destinationKey = `submissions/${crypto.randomUUID()}.pdf`;
  await env.BUCKET.put(destinationKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  });

  const submissionInsert = env.DB.prepare(
    `INSERT INTO submissions
       (question_id, user_id, section, batch, pdf_key, file_size,
        watermarked_pdf_key, watermark_status, watermark_error)
     SELECT ?, a.user_id, a.section, a.batch, ?, ?, NULL, 'awaiting', NULL
     FROM auto_submissions AS a
     WHERE a.id = ?
       AND a.status <> 'published'
       AND NOT EXISTS (SELECT 1 FROM submissions AS s WHERE s.pdf_key = ?)`,
  ).bind(questionId, destinationKey, object.size, autoSubmissionId, destinationKey);

  const autoUpdate = env.DB.prepare(
    `UPDATE auto_submissions
     SET status = 'published',
         rejected_reason = NULL,
         processing_error = NULL,
         reviewed_by = ?,
         question_id = ?,
         submission_id = (
           SELECT s.id FROM submissions AS s
           WHERE s.pdf_key = ?
             AND s.user_id = auto_submissions.user_id
           ORDER BY s.id DESC
           LIMIT 1
         )
     WHERE id = ? AND status <> 'published'`,
  ).bind(reviewerId, questionId, destinationKey, autoSubmissionId);

  let newSubmissionId: number | null = null;
  try {
    const results = await env.DB.batch([submissionInsert, autoUpdate]);
    if ((results[1]?.meta.changes ?? 0) === 0) {
      // Lost a race (already published) — drop the orphaned copy, treat as no-op.
      await deleteObject(env.BUCKET, destinationKey);
      return null;
    }
    const [linked] = await db
      .select({ id: autoSubmissions.submissionId })
      .from(autoSubmissions)
      .where(eq(autoSubmissions.id, autoSubmissionId))
      .limit(1);
    newSubmissionId = linked?.id ?? null;
  } catch (err) {
    await deleteObject(env.BUCKET, destinationKey);
    throw err;
  }

  if (newSubmissionId !== null) {
    await startWatermark(env, newSubmissionId);
  }
  return newSubmissionId;
};

const deleteObject = async (bucket: R2Bucket, key: string): Promise<void> => {
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed for auto submission copy", key, err);
  }
};
