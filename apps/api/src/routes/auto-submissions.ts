import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, count, desc, eq, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import { autoSubmissions, submissions, type AutoSubmission } from "../db/schema";
import type { AiExtraction } from "../lib/ai-extraction";
import { buildMeta } from "@diuqbank/shared/utils/pagination";
import { parseId } from "../lib/parse-id";
import { parsePdfFile } from "../lib/pdf-upload";
import {
  findOrCreateCourse,
  findOrCreateDepartment,
  findOrCreateExamType,
  findOrCreateQuestion,
  findOrCreateSemester,
} from "../lib/taxonomy";
import { fileUrlFor } from "../lib/user-shape";
import { validate } from "../lib/validator";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import {
  autoSubmissionReprocessSchema,
  autoSubmissionsListQuery,
} from "@diuqbank/shared/schemas/auto-submissions";
import type { AppEnv } from "../types";

const route = new Hono<AppEnv>();

route.use("*", requireAuth);

const parseAiResult = (raw: string | null): AiExtraction | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiExtraction;
  } catch {
    return null;
  }
};

const serializeAutoSubmission = (row: AutoSubmission, origin: string) => ({
  id: row.id,
  userId: row.userId,
  status: row.status,
  fileSize: row.fileSize,
  aiResult: parseAiResult(row.aiResult),
  extraContext: row.extraContext,
  errorMessage: row.errorMessage,
  submissionId: row.submissionId,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const deletePdf = async (
  bucket: R2Bucket,
  key: string | null,
): Promise<void> => {
  if (!key) return;
  try {
    await bucket.delete(key);
  } catch (err) {
    console.error("R2 delete failed for auto submission PDF", key, err);
  }
};

const REQUIRED_FIELDS = [
  "departmentName",
  "departmentShortName",
  "courseName",
  "semesterName",
  "examTypeName",
] as const;

type ConfirmableExtraction = AiExtraction & {
  departmentName: string;
  departmentShortName: string;
  courseName: string;
  semesterName: string;
  examTypeName: string;
};

// Gate confirmation on the AI's own quality verdict + the fields we must have.
const validateForConfirm = (
  result: AiExtraction | null,
): ConfirmableExtraction => {
  if (!result) {
    throw new HTTPException(400, {
      message:
        "No AI result yet — wait for processing to finish, or reprocess.",
    });
  }
  if (!result.isAcceptable) {
    const reason = result.rejectionReason?.trim();
    throw new HTTPException(400, {
      message: reason
        ? `Rejected by AI review: ${reason} Reprocess with extra context if you disagree.`
        : "Rejected by AI review. Reprocess with extra context if you disagree.",
    });
  }
  const missing = REQUIRED_FIELDS.filter((field) => !result[field]);
  if (missing.length) {
    throw new HTTPException(400, {
      message: `AI result is missing required fields: ${missing.join(", ")}. Reprocess to fill them in.`,
    });
  }
  return result as ConfirmableExtraction;
};

route.get("/", validate("query", autoSubmissionsListQuery), async (c) => {
  const { page, perPage } = c.req.valid("query");
  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;
  const where = eq(autoSubmissions.userId, userId);

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(autoSubmissions)
      .where(where)
      .orderBy(desc(autoSubmissions.createdAt), desc(autoSubmissions.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ value: count() }).from(autoSubmissions).where(where),
  ]);

  return c.json({
    data: items.map((item) => serializeAutoSubmission(item, origin)),
    meta: buildMeta(page, perPage, total),
  });
});

route.post("/", rateLimit((env) => env.AUTH_RATELIMIT), async (c) => {
  const body = await c.req.parseBody();
  const pdf = await parsePdfFile(body["pdf"]);
  const userId = c.get("user").sub;
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
      })
      .returning({ id: autoSubmissions.id });
  } catch (err) {
    await deletePdf(c.env.BUCKET, key);
    throw err;
  }

  // Kick off the durable compress -> extract -> persist pipeline. If it can't be
  // scheduled, mark the row failed so the user can retry rather than be stuck.
  try {
    await c.env.AUTO_SUBMISSION_WORKFLOW.create({
      params: { autoSubmissionId: created.id },
    });
  } catch (err) {
    console.error("AUTO_SUBMISSION_WORKFLOW.create failed", created.id, err);
    await db
      .update(autoSubmissions)
      .set({
        status: "failed",
        errorMessage: "Failed to start processing. Please reprocess.",
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(autoSubmissions.id, created.id));
  }

  const row = await db.query.autoSubmissions.findFirst({
    where: eq(autoSubmissions.id, created.id),
  });
  if (!row) {
    throw new HTTPException(500, {
      message: "Failed to load created auto submission",
    });
  }
  return c.json(serializeAutoSubmission(row, origin), 201);
});

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
  return c.json(serializeAutoSubmission(row, new URL(c.req.url).origin));
});

route.post(
  "/:id/reprocess",
  rateLimit((env) => env.AUTH_RATELIMIT),
  validate("json", autoSubmissionReprocessSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (id === null) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }

    const { extraContext } = c.req.valid("json");
    const userId = c.get("user").sub;
    const db = getDb(c.env.DB);
    const origin = new URL(c.req.url).origin;

    const [row] = await db
      .select({ status: autoSubmissions.status })
      .from(autoSubmissions)
      .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)))
      .limit(1);
    if (!row) {
      throw new HTTPException(404, { message: "Auto submission not found" });
    }
    if (row.status !== "awaiting_confirmation" && row.status !== "failed") {
      throw new HTTPException(409, {
        message: `Cannot reprocess an auto submission with status "${row.status}"`,
      });
    }

    await db
      .update(autoSubmissions)
      .set({
        status: "processing",
        extraContext: extraContext ?? null,
        errorMessage: null,
        updatedAt: sql`(unixepoch())`,
      })
      .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)));

    try {
      await c.env.AUTO_SUBMISSION_WORKFLOW.create({ params: { autoSubmissionId: id } });
    } catch (err) {
      console.error("AUTO_SUBMISSION_WORKFLOW.create failed (reprocess)", id, err);
      await db
        .update(autoSubmissions)
        .set({
          status: "failed",
          errorMessage: "Failed to start processing. Please reprocess.",
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(autoSubmissions.id, id));
      throw new HTTPException(502, {
        message: "Failed to start reprocessing",
      });
    }

    const updated = await db.query.autoSubmissions.findFirst({
      where: eq(autoSubmissions.id, id),
    });
    if (!updated) {
      throw new HTTPException(500, { message: "Failed to load auto submission" });
    }
    return c.json(serializeAutoSubmission(updated, origin));
  },
);

route.post("/:id/confirm", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const origin = new URL(c.req.url).origin;

  const [row] = await db
    .select()
    .from(autoSubmissions)
    .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  if (row.status === "confirmed") {
    throw new HTTPException(409, {
      message: "Auto submission is already confirmed",
    });
  }
  if (row.status !== "awaiting_confirmation") {
    throw new HTTPException(409, {
      message: `Cannot confirm an auto submission with status "${row.status}"`,
    });
  }

  const data = validateForConfirm(parseAiResult(row.aiResult));

  // Resolve (creating as needed) the taxonomy + parent question.
  const departmentId = await findOrCreateDepartment(
    db,
    data.departmentName,
    data.departmentShortName,
  );
  const [courseId, semesterId, examTypeId] = await Promise.all([
    findOrCreateCourse(db, departmentId, data.courseName),
    findOrCreateSemester(db, data.semesterName),
    findOrCreateExamType(db, data.examTypeName),
  ]);
  const questionId = await findOrCreateQuestion(db, {
    departmentId,
    courseId,
    semesterId,
    examTypeId,
  });

  // Copy the ORIGINAL (full-quality) PDF into the submissions namespace.
  const original = await c.env.BUCKET.get(row.pdfKey);
  if (!original) {
    throw new HTTPException(409, {
      message: "Auto submission PDF is missing from storage",
    });
  }
  const submissionKey = `submissions/${crypto.randomUUID()}.pdf`;
  await c.env.BUCKET.put(submissionKey, original.body, {
    httpMetadata: original.httpMetadata,
    customMetadata: original.customMetadata,
  });

  let submissionId: number;
  try {
    const [inserted] = await db
      .insert(submissions)
      .values({
        questionId,
        userId: row.userId,
        section: data.section,
        batch: data.batch,
        pdfKey: submissionKey,
        fileSize: row.fileSize,
      })
      .returning({ id: submissions.id });
    submissionId = inserted.id;
  } catch (err) {
    await deletePdf(c.env.BUCKET, submissionKey);
    throw err;
  }

  // Point the upload at the moved object, finalize, and clean up the original +
  // compressed scratch copies (mirrors the manual approve "move").
  await db
    .update(autoSubmissions)
    .set({
      status: "confirmed",
      submissionId,
      pdfKey: submissionKey,
      compressedPdfKey: null,
      errorMessage: null,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(autoSubmissions.id, id));

  await deletePdf(c.env.BUCKET, row.pdfKey);
  await deletePdf(c.env.BUCKET, row.compressedPdfKey);

  const updated = await db.query.autoSubmissions.findFirst({
    where: eq(autoSubmissions.id, id),
  });
  return c.json({
    autoSubmission: updated ? serializeAutoSubmission(updated, origin) : null,
    submission: {
      id: submissionId,
      questionId,
      pdfUrl: fileUrlFor(origin, submissionKey),
    },
    created: { departmentId, courseId, semesterId, examTypeId, questionId },
  });
});

route.delete("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }

  const userId = c.get("user").sub;
  const db = getDb(c.env.DB);
  const [row] = await db
    .select({
      status: autoSubmissions.status,
      pdfKey: autoSubmissions.pdfKey,
      compressedPdfKey: autoSubmissions.compressedPdfKey,
    })
    .from(autoSubmissions)
    .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)))
    .limit(1);
  if (!row) {
    throw new HTTPException(404, { message: "Auto submission not found" });
  }
  if (row.status === "confirmed") {
    throw new HTTPException(409, {
      message:
        "Confirmed auto submissions cannot be deleted (the submission is the canonical record)",
    });
  }

  await db
    .delete(autoSubmissions)
    .where(and(eq(autoSubmissions.id, id), eq(autoSubmissions.userId, userId)));
  await deletePdf(c.env.BUCKET, row.pdfKey);
  await deletePdf(c.env.BUCKET, row.compressedPdfKey);

  return c.body(null, 204);
});

export default route;
