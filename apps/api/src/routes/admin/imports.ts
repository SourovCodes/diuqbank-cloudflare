import { Hono } from "hono";
import { isNotNull } from "drizzle-orm";

import { getDb, type Db } from "../../db/client";
import { autoSubmissions } from "../../db/schema";
import { startAutoSubmission } from "../../lib/auto-submission";
import { findOrCreateContributor } from "../../lib/contributor";
import { fetchImageToR2 } from "../../lib/image-upload";
import { assertPdfBuffer } from "../../lib/pdf-upload";
import {
  fetchSourcePage,
  selectUnimported,
  type SourceSubmission,
} from "../../lib/source-api";
import { validate } from "../../lib/validator";
import { adminImportAutoSubmissionsSchema } from "../../shared/schemas/admin/imports";
import type { AppEnv, Bindings } from "../../types";

const route = new Hono<AppEnv>();

// Bound the feed walk per request. Must exceed the feed's total page count
// (~22 pages at 100 items/page as of 2026-07), otherwise the walk — which
// restarts from the oldest page every call — can exhaust the cap on
// already-imported pages before reaching the unimported frontier and stall.
const PAGE_SCAN_CAP = 50;
const PDF_DOWNLOAD_TIMEOUT_MS = 30_000;

/** Seed the AI extractor with the (unmoderated) legacy taxonomy as a hint. */
const legacyHint = (item: SourceSubmission): string =>
  `Legacy metadata (may be wrong) — Department: ${item.department.name} (${item.department.short_name}); Course: ${item.course.name}; Semester: ${item.semester.name}; Exam: ${item.exam_type.name}`.slice(
    0,
    1000,
  );

/**
 * Legacy `created_at` (ISO 8601) → epoch seconds, so the imported row (and the
 * live submission it eventually publishes) keeps the original upload date.
 * Undefined on an unparseable value, falling back to the column default (now).
 */
const legacyCreatedAt = (item: SourceSubmission): number | undefined => {
  const ms = Date.parse(item.created_at);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
};

route.post(
  "/auto-submissions",
  validate("query", adminImportAutoSubmissionsSchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const db = getDb(c.env.DB);

    // Everything already pulled from the legacy feed, by legacy id.
    const imported = await db
      .select({ legacyId: autoSubmissions.legacyId })
      .from(autoSubmissions)
      .where(isNotNull(autoSubmissions.legacyId));
    const importedIds = new Set(
      imported.map((r) => r.legacyId).filter((v): v is number => v !== null),
    );

    const { items, remaining } = await selectUnimported(
      fetchSourcePage,
      importedIds,
      limit,
      PAGE_SCAN_CAP,
    );

    // Resolve each distinct uploader once (the feed repeats uploaders), so
    // find-or-create doesn't race itself within the batch.
    const contributorByEmail = new Map<string, number>();
    for (const item of items) {
      if (contributorByEmail.has(item.user.email)) continue;
      const userId = await findOrCreateContributor(
        db,
        {
          name: item.user.name,
          email: item.user.email,
          username: item.user.username,
        },
        () => fetchImageToR2(c.env.BUCKET, item.user.avatar_url),
      );
      contributorByEmail.set(item.user.email, userId);
    }

    const results = await Promise.all(
      items.map((item) => importOne(c.env, db, item, contributorByEmail)),
    );

    const okResults = results.filter((r) => "autoSubmissionId" in r);
    const failed = results.filter((r) => "error" in r);
    return c.json({
      imported: okResults,
      failed,
      remaining,
    });
  },
);

type ImportOk = {
  legacyId: number;
  autoSubmissionId: number;
  userId: number;
};
type ImportFail = { legacyId: number; error: string };

const importOne = async (
  env: Bindings,
  db: Db,
  item: SourceSubmission,
  contributorByEmail: Map<string, number>,
): Promise<ImportOk | ImportFail> => {
  const userId = contributorByEmail.get(item.user.email);
  if (userId === undefined) {
    return { legacyId: item.id, error: "contributor not resolved" };
  }

  let key: string | undefined;
  try {
    const res = await fetch(item.pdf_original_temporary_url, {
      signal: AbortSignal.timeout(PDF_DOWNLOAD_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
    const buffer = await res.arrayBuffer();
    assertPdfBuffer(buffer);

    key = `auto-submissions/${crypto.randomUUID()}.pdf`;
    await env.BUCKET.put(key, buffer, {
      httpMetadata: { contentType: "application/pdf" },
    });

    const [created] = await db
      .insert(autoSubmissions)
      .values({
        userId,
        legacyId: item.id,
        legacyViews: item.views ?? null,
        pdfKey: key,
        fileSize: buffer.byteLength,
        extraContext: legacyHint(item),
        createdAt: legacyCreatedAt(item),
      })
      .returning({ id: autoSubmissions.id });

    // Kick off AI processing on the throttled queue (never throws; flips the row
    // to `failed` on enqueue error).
    await startAutoSubmission(env, created.id);

    return { legacyId: item.id, autoSubmissionId: created.id, userId };
  } catch (err) {
    if (key) {
      // Insert/enqueue failed after the upload — don't leave an orphan object.
      try {
        await env.BUCKET.delete(key);
      } catch (delErr) {
        console.error("R2 cleanup failed for import", key, delErr);
      }
    }
    const error = err instanceof Error ? err.message : "import failed";
    return { legacyId: item.id, error };
  }
};

export default route;
