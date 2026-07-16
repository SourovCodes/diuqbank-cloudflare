import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Db } from "../db/client";
import {
  courses,
  departments,
  examTypes,
  manualSubmissions,
  semesters,
} from "../db/schema";
import type { TaxonomyMatches } from "../shared/types";
import type { Bindings } from "../types";
import { invalidateSubmission } from "./cache";
import { startWatermark } from "./pdf-processor";
import { findOrCreateQuestion } from "./taxonomy";

type TaxonomyNames = {
  departmentName: string | null;
  courseName: string | null;
  semesterName: string | null;
  examTypeName: string | null;
};

/**
 * Resolve the free-text taxonomy values of a manual submission to existing
 * entity ids (case-insensitive exact match; SQLite `lower()` is ASCII-only,
 * which covers our Latin-script taxonomy). Unlike the old AI pipeline this
 * NEVER creates taxonomy: a null id means no entity with that name exists yet,
 * and approving is blocked until an admin creates it (or edits the value to
 * match an existing entity). Courses are scoped to their department, so the
 * course can only match once the department does.
 */
export const resolveTaxonomyMatches = async (
  db: Db,
  names: TaxonomyNames,
): Promise<TaxonomyMatches> => {
  const matchByName = async (
    table: typeof departments | typeof semesters | typeof examTypes,
    name: string | null,
  ): Promise<number | null> => {
    if (!name) return null;
    const [row] = await db
      .select({ id: table.id })
      .from(table)
      .where(sql`lower(${table.name}) = lower(${name})`)
      .limit(1);
    return row?.id ?? null;
  };

  const [departmentId, semesterId, examTypeId] = await Promise.all([
    matchByName(departments, names.departmentName),
    matchByName(semesters, names.semesterName),
    matchByName(examTypes, names.examTypeName),
  ]);

  let courseId: number | null = null;
  if (departmentId !== null && names.courseName) {
    const [row] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          eq(courses.departmentId, departmentId),
          sql`lower(${courses.name}) = lower(${names.courseName})`,
        ),
      )
      .limit(1);
    courseId = row?.id ?? null;
  }

  return { departmentId, courseId, semesterId, examTypeId };
};

/**
 * Turn an approved manual submission into a live `submission`. Every free-text
 * taxonomy value must resolve to an EXISTING entity (see
 * `resolveTaxonomyMatches`) — this path deliberately cannot create taxonomy, so
 * a 409 lists what's missing for the admin to create or correct first. Only the
 * question row (the combination of the four ids) is find-or-created. The PDF is
 * copied into the `submissions/` namespace, then the submission insert and the
 * manual-row link run in one atomic batch gated on the row not being
 * `published`, so a double-approve can't create duplicates.
 *
 * Returns the new submission id, or `null` when the row was already published
 * (no-op).
 */
export const publishManualSubmission = async (
  env: Bindings,
  db: Db,
  manualSubmissionId: number,
  reviewerId: number,
): Promise<number | null> => {
  const row = await db.query.manualSubmissions.findFirst({
    where: eq(manualSubmissions.id, manualSubmissionId),
    with: { user: { columns: { username: true } } },
  });
  if (!row) {
    throw new HTTPException(404, { message: "Manual submission not found" });
  }
  if (row.status === "published") return null;
  if (
    !row.departmentName ||
    !row.courseName ||
    !row.semesterName ||
    !row.examTypeName
  ) {
    throw new HTTPException(400, {
      message:
        "Fill in department, course, semester and exam type before approving",
    });
  }

  const matches = await resolveTaxonomyMatches(db, row);
  const missing: string[] = [];
  if (matches.departmentId === null) missing.push(`department "${row.departmentName}"`);
  if (matches.courseId === null) missing.push(`course "${row.courseName}"`);
  if (matches.semesterId === null) missing.push(`semester "${row.semesterName}"`);
  if (matches.examTypeId === null) missing.push(`exam type "${row.examTypeName}"`);
  if (missing.length > 0) {
    throw new HTTPException(409, {
      message: `Cannot approve: no existing ${missing.join(", ")}. Create the missing entities or edit the values to match existing ones.`,
    });
  }

  const questionId = await findOrCreateQuestion(db, {
    departmentId: matches.departmentId!,
    courseId: matches.courseId!,
    semesterId: matches.semesterId!,
    examTypeId: matches.examTypeId!,
  });

  const object = await env.BUCKET.get(row.pdfKey);
  if (!object) {
    throw new HTTPException(409, {
      message: "Uploaded PDF is missing from storage",
    });
  }

  // Copy into the submissions namespace so the live submission's file lifecycle
  // is independent of the manual-submission record (which the user keeps).
  const destinationKey = `submissions/${crypto.randomUUID()}.pdf`;
  await env.BUCKET.put(destinationKey, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  });

  // Seeding view_count from legacy_views also bumps the question's aggregate
  // via the submissions_view_count_after_insert trigger. created_at is carried
  // over from the manual row so legacy imports keep their original upload date
  // (for normal uploads it equals the upload time, not the approval time).
  const submissionInsert = env.DB.prepare(
    `INSERT INTO submissions
       (question_id, user_id, section, batch, pdf_key, file_size,
        watermarked_pdf_key, watermark_status, watermark_error, view_count,
        created_at)
     SELECT ?, m.user_id, m.section, m.batch, ?, ?, NULL, 'awaiting', NULL,
            COALESCE(m.legacy_views, 0), m.created_at
     FROM manual_submissions AS m
     WHERE m.id = ?
       AND m.status <> 'published'
       AND NOT EXISTS (SELECT 1 FROM submissions AS s WHERE s.pdf_key = ?)`,
  ).bind(questionId, destinationKey, object.size, manualSubmissionId, destinationKey);

  const manualUpdate = env.DB.prepare(
    `UPDATE manual_submissions
     SET status = 'published',
         rejected_reason = NULL,
         reviewed_by = ?,
         question_id = ?,
         submission_id = (
           SELECT s.id FROM submissions AS s
           WHERE s.pdf_key = ?
             AND s.user_id = manual_submissions.user_id
           ORDER BY s.id DESC
           LIMIT 1
         )
     WHERE id = ? AND status <> 'published'`,
  ).bind(reviewerId, questionId, destinationKey, manualSubmissionId);

  let newSubmissionId: number | null = null;
  try {
    const results = await env.DB.batch([submissionInsert, manualUpdate]);
    if ((results[1]?.meta.changes ?? 0) === 0) {
      // Lost a race (already published) — drop the orphaned copy, treat as no-op.
      await deleteObject(env.BUCKET, destinationKey);
      return null;
    }
    const [linked] = await db
      .select({ id: manualSubmissions.submissionId })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.id, manualSubmissionId))
      .limit(1);
    newSubmissionId = linked?.id ?? null;
  } catch (err) {
    await deleteObject(env.BUCKET, destinationKey);
    throw err;
  }

  if (newSubmissionId !== null) {
    await startWatermark(env, newSubmissionId);
    // Approving can't create taxonomy, but it may create a question and always
    // adds a submission — invalidateSubmission covers both (q:list included).
    await invalidateSubmission(env, questionId, row.user.username);
  }
  return newSubmissionId;
};

export const deleteObject = async (
  bucket: R2Bucket,
  key: string,
): Promise<void> => {
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed for manual submission PDF", key, err);
  }
};
