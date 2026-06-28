import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { getDb, type Db } from "../../db/client";
import {
  courses,
  departments,
  examTypes,
  manualSubmissions,
  questions,
  semesters,
  submissions,
  users,
} from "../../db/schema";
import { toAdminSubmission } from "../../lib/admin-shape";
import { parsePdfFile } from "../../lib/pdf-upload";
import { fetchProfileImage } from "../../lib/profile-image-from-url";
import { validate } from "../../lib/validator";
import { migrationSubmissionForm } from "@diuqbank/shared/schemas/admin/migration";
import type { AppEnv } from "../../types";
import { loadManualSubmission } from "./manual-submissions";

const route = new Hono<AppEnv>();

// Eager-load shape backing `toAdminSubmission` (mirrors admin/submissions.ts).
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

const caseInsensitiveEq = (column: AnySQLiteColumn, value: string): SQL =>
  sql`lower(${column}) = lower(${value})`;

// Best-effort delete of stored objects; never fail the request on cleanup.
const deleteObject = async (bucket: R2Bucket, key: string): Promise<void> => {
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed during migration", key, err);
  }
};

// --- Resolve-or-create helpers for the lookup tables. Each finds by name
// (case-insensitive), creates when absent, and tolerates a concurrent insert by
// re-selecting. A surviving unique violation (e.g. a department short name owned
// by a different department) propagates to the global onError → 409. ---

const resolveDepartment = async (
  db: Db,
  name: string,
  shortName: string,
): Promise<number> => {
  const find = async () => {
    const [row] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(caseInsensitiveEq(departments.name, name))
      .limit(1);
    return row?.id;
  };
  const existing = await find();
  if (existing) return existing;
  try {
    const [created] = await db
      .insert(departments)
      .values({ name, shortName })
      .returning({ id: departments.id });
    return created.id;
  } catch (err) {
    const again = await find();
    if (again) return again;
    throw err;
  }
};

const resolveSemester = async (db: Db, name: string): Promise<number> => {
  const find = async () => {
    const [row] = await db
      .select({ id: semesters.id })
      .from(semesters)
      .where(caseInsensitiveEq(semesters.name, name))
      .limit(1);
    return row?.id;
  };
  const existing = await find();
  if (existing) return existing;
  try {
    const [created] = await db
      .insert(semesters)
      .values({ name })
      .returning({ id: semesters.id });
    return created.id;
  } catch (err) {
    const again = await find();
    if (again) return again;
    throw err;
  }
};

const resolveExamType = async (db: Db, name: string): Promise<number> => {
  const find = async () => {
    const [row] = await db
      .select({ id: examTypes.id })
      .from(examTypes)
      .where(caseInsensitiveEq(examTypes.name, name))
      .limit(1);
    return row?.id;
  };
  const existing = await find();
  if (existing) return existing;
  try {
    const [created] = await db
      .insert(examTypes)
      .values({ name })
      .returning({ id: examTypes.id });
    return created.id;
  } catch (err) {
    const again = await find();
    if (again) return again;
    throw err;
  }
};

const resolveCourse = async (
  db: Db,
  departmentId: number,
  name: string,
): Promise<number> => {
  const find = async () => {
    const [row] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          eq(courses.departmentId, departmentId),
          caseInsensitiveEq(courses.name, name),
        ),
      )
      .limit(1);
    return row?.id;
  };
  const existing = await find();
  if (existing) return existing;
  try {
    const [created] = await db
      .insert(courses)
      .values({ departmentId, name })
      .returning({ id: courses.id });
    return created.id;
  } catch (err) {
    const again = await find();
    if (again) return again;
    throw err;
  }
};

// Upsert the question for the 4-tuple and return its id.
const resolveQuestion = async (
  db: Db,
  departmentId: number,
  courseId: number,
  semesterId: number,
  examTypeId: number,
): Promise<number> => {
  await db
    .insert(questions)
    .values({ departmentId, courseId, semesterId, examTypeId })
    .onConflictDoNothing();
  const [row] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(
      and(
        eq(questions.departmentId, departmentId),
        eq(questions.courseId, courseId),
        eq(questions.semesterId, semesterId),
        eq(questions.examTypeId, examTypeId),
      ),
    )
    .limit(1);
  return row.id;
};

// Find the contributor by email, or create them. New contributors get their
// profile picture downloaded into R2 (best-effort). A username clash with a
// *different* email surfaces as a 409.
const resolveContributor = async (
  c: Context<AppEnv>,
  db: Db,
  input: {
    email: string;
    username: string;
    name: string;
    imageUrl?: string;
  },
): Promise<number> => {
  const findByEmail = async () => {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    return row?.id;
  };

  const existing = await findByEmail();
  if (existing) return existing;

  let imageKey: string | null = null;
  if (input.imageUrl) {
    const img = await fetchProfileImage(input.imageUrl);
    if (img) {
      imageKey = `users/${crypto.randomUUID()}.${img.ext}`;
      await c.env.BUCKET.put(imageKey, img.buffer, {
        httpMetadata: { contentType: img.contentType },
      });
    }
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        username: input.username,
        imageKey,
        role: "user",
      })
      .returning({ id: users.id });
    return created.id;
  } catch {
    // Concurrent insert for the same email — reuse that row, drop our image.
    const again = await findByEmail();
    if (again) {
      if (imageKey) await deleteObject(c.env.BUCKET, imageKey);
      return again;
    }
    // Otherwise the username collides with a different account.
    if (imageKey) await deleteObject(c.env.BUCKET, imageKey);
    throw new HTTPException(409, {
      message: `Contributor username "${input.username}" is already taken`,
    });
  }
};

// POST /admin/migration/submissions — import one legacy submission: its PDF plus
// flat metadata. The contributor is find-or-created and the `legacyId` records
// the back-reference (unique across submissions + manual submissions → a record
// migrates only once). With `autoPublish` true (default) lookups are
// resolved-or-created and a live submission is published (PDF stored as-is, no
// watermarking); with `autoPublish` false the import is filed into the review
// queue as a pending manual submission instead.
route.post("/submissions", validate("form", migrationSubmissionForm), async (c) => {
  const input = c.req.valid("form");
  const body = await c.req.parseBody();
  const pdf = await parsePdfFile(body["pdf"]);

  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  // Pre-check the legacy id across both tables for a clear 409 (the unique
  // constraints are the real guard against a race). A legacy record may have
  // been published directly (submissions) or filed for review (manualSubmissions).
  const [[publishedDup], [reviewDup]] = await Promise.all([
    db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.legacyId, input.legacyId))
      .limit(1),
    db
      .select({ id: manualSubmissions.id })
      .from(manualSubmissions)
      .where(eq(manualSubmissions.legacyId, input.legacyId))
      .limit(1),
  ]);
  if (publishedDup || reviewDup) {
    throw new HTTPException(409, {
      message: `Legacy id "${input.legacyId}" has already been migrated`,
    });
  }

  // The contributor is attributed in both modes.
  const userId = await resolveContributor(c, db, {
    email: input.contributorEmail,
    username: input.contributorUsername,
    name: input.contributorName,
    imageUrl: input.contributorImageUrl,
  });

  // autoPublish=false → file the import into the review queue as a pending
  // manual submission. The lookup names are kept verbatim; no department /
  // course / semester / exam type or question is created. An admin approves it
  // later, which creates the live submission and carries this legacy id forward.
  if (!input.autoPublish) {
    const key = `manual-submissions/${crypto.randomUUID()}.pdf`;
    await c.env.BUCKET.put(key, pdf.buffer, {
      httpMetadata: { contentType: pdf.contentType },
    });

    let createdManual;
    try {
      [createdManual] = await db
        .insert(manualSubmissions)
        .values({
          userId,
          departmentName: input.departmentName,
          departmentShortName: input.departmentShortName,
          courseName: input.courseName,
          semesterName: input.semesterName,
          examTypeName: input.examTypeName,
          pdfKey: key,
          legacyId: input.legacyId,
          status: "pending_review",
        })
        .returning({ id: manualSubmissions.id });
    } catch (err) {
      await deleteObject(c.env.BUCKET, key);
      throw err;
    }

    const manual = await loadManualSubmission(db, createdManual.id, origin);
    if (!manual) {
      throw new HTTPException(500, {
        message: "Failed to load migrated manual submission",
      });
    }
    return c.json(manual, 201);
  }

  // autoPublish=true → publish directly: resolve/create lookups + question and
  // create a live submission.
  const departmentId = await resolveDepartment(
    db,
    input.departmentName,
    input.departmentShortName,
  );
  const [courseId, semesterId, examTypeId] = await Promise.all([
    resolveCourse(db, departmentId, input.courseName),
    resolveSemester(db, input.semesterName),
    resolveExamType(db, input.examTypeName),
  ]);
  const questionId = await resolveQuestion(
    db,
    departmentId,
    courseId,
    semesterId,
    examTypeId,
  );

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
        section: input.section ?? null,
        batch: input.batch ?? null,
        pdfKey: key,
        fileSize: pdf.buffer.byteLength,
        legacyId: input.legacyId,
        // Migrated PDFs are stored as-is; the public read serves
        // `watermarkedPdfKey ?? pdfKey`, so a null watermarked key serves the
        // original. No watermark workflow is started.
        watermarkStatus: "completed",
        watermarkedPdfKey: null,
      })
      .returning({ id: submissions.id });
  } catch (err) {
    await deleteObject(c.env.BUCKET, key);
    throw err;
  }

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, created.id),
    with: submissionWith,
  });
  if (!row) {
    throw new HTTPException(500, {
      message: "Failed to load migrated submission",
    });
  }
  return c.json(toAdminSubmission(row, origin), 201);
});

export default route;
