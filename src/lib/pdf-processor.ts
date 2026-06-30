import { and, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { submissions } from "../db/schema";
import type { Bindings } from "../types";

/** Max length the PDF Processor accepts for the `watermark_text` field. */
const MAX_WATERMARK_TEXT = 255;
const PDF_PROCESSOR_TIMEOUT_MS = 120_000;

/**
 * Compress a PDF via the external PDF Processor service (Ghostscript "ebook"
 * preset). Returns the smaller PDF bytes; throws on a non-2xx response. Used by
 * the AI pipeline to shrink a PDF before the Gemini call (smaller payload +
 * fewer tokens). Like `watermarkPdf`, this hits the concurrency-limited service
 * and so is only ever called from the throttled queue consumer.
 */
export const compressPdf = async (
  env: Bindings,
  pdf: ArrayBuffer,
): Promise<ArrayBuffer> => {
  const form = new FormData();
  form.append("pdf", new Blob([pdf], { type: "application/pdf" }), "upload.pdf");

  const res = await fetch(`${env.PDF_PROCESSOR_URL}/api/pdfs/compress`, {
    method: "POST",
    headers: { "X-API-Key": env.PDF_PROCESSOR_API_KEY },
    body: form,
    signal: AbortSignal.timeout(PDF_PROCESSOR_TIMEOUT_MS),
  });

  if (!res.ok) {
    let message = `PDF compression failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return res.arrayBuffer();
};

/**
 * Build the top-header watermark text for a submission. Branding plus the
 * uploader's name, clamped to the service's 255-char limit.
 */
export const buildWatermarkText = (uploaderName: string): string =>
  `For more questions: https://diuqbank.com | Uploader: ${uploaderName}`.slice(
    0,
    MAX_WATERMARK_TEXT,
  );

/**
 * Watermark + compress a PDF via the external PDF Processor service
 * (Ghostscript "ebook" preset + a top-header text watermark).
 *
 * Returns the processed PDF bytes. Throws a plain `Error` on a non-2xx response
 * (the caller is a Workflow step, which retries / marks the row failed).
 */
export const watermarkPdf = async (
  env: Bindings,
  pdf: ArrayBuffer,
  watermarkText: string,
): Promise<ArrayBuffer> => {
  const form = new FormData();
  form.append("pdf", new Blob([pdf], { type: "application/pdf" }), "upload.pdf");
  form.append("watermark_text", watermarkText);

  const res = await fetch(
    `${env.PDF_PROCESSOR_URL}/api/pdfs/watermark-compress`,
    {
      method: "POST",
      headers: { "X-API-Key": env.PDF_PROCESSOR_API_KEY },
      body: form,
      signal: AbortSignal.timeout(PDF_PROCESSOR_TIMEOUT_MS),
    },
  );

  if (!res.ok) {
    let message = `PDF watermarking failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return res.arrayBuffer();
};

/**
 * Enqueue watermarking for a submission at `watermarkStatus = "awaiting"`. The
 * work runs on the throttled `PDF_QUEUE` consumer (see `runWatermark`). Never
 * throws: if the enqueue fails, the row is flipped to `failed` so the stuck
 * state is visible (and recoverable via a PDF re-upload) rather than silently
 * stranded at `awaiting`.
 */
export const startWatermark = async (
  env: Bindings,
  submissionId: number,
): Promise<void> => {
  try {
    await env.PDF_QUEUE.send({ kind: "watermark", submissionId });
  } catch (err) {
    console.error("PDF_QUEUE.send(watermark) failed", submissionId, err);
    const message =
      err instanceof Error ? err.message : "Failed to start watermarking";
    await markWatermarkFailed(env, submissionId, message);
  }
};

/**
 * Watermark + persist a single submission. The body of the former
 * WatermarkWorkflow, run by the queue consumer. Idempotent: a row that is
 * already watermarked is a no-op (so a redelivery never re-calls the service),
 * and the persist is guarded on `pdf_key` so a run superseded by a PDF replace
 * leaves the new file untouched. Throws on failure so the consumer can retry.
 */
export const runWatermark = async (
  env: Bindings,
  submissionId: number,
): Promise<void> => {
  const db = getDb(env.DB);

  const row = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
    columns: { pdfKey: true, watermarkedPdfKey: true },
    with: { user: { columns: { name: true } } },
  });
  // Submission was deleted between enqueue and run — nothing to do.
  if (!row) return;
  // Already watermarked (e.g. a redelivery) — idempotent.
  if (row.watermarkedPdfKey) {
    await db
      .update(submissions)
      .set({ watermarkStatus: "completed", watermarkError: null })
      .where(eq(submissions.id, submissionId));
    return;
  }

  const original = await env.BUCKET.get(row.pdfKey);
  if (!original) throw new Error("Original PDF missing from storage");

  const watermarked = await watermarkPdf(
    env,
    await original.arrayBuffer(),
    buildWatermarkText(row.user?.name ?? "Anonymous"),
  );
  const watermarkedKey = `submissions/${crypto.randomUUID()}-watermarked.pdf`;
  await env.BUCKET.put(watermarkedKey, watermarked, {
    httpMetadata: { contentType: "application/pdf" },
  });

  // The `pdf_key` guard means a run superseded by a PDF replace is a harmless
  // no-op; the object is left orphaned for manual cleanup rather than
  // overwriting the newer file.
  await db
    .update(submissions)
    .set({
      watermarkedPdfKey: watermarkedKey,
      watermarkStatus: "completed",
      watermarkError: null,
    })
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(submissions.pdfKey, row.pdfKey),
      ),
    );
};

/** Flag a submission's watermarking as terminally failed (visible to admins). */
export const markWatermarkFailed = async (
  env: Bindings,
  submissionId: number,
  message: string,
): Promise<void> => {
  try {
    await getDb(env.DB)
      .update(submissions)
      .set({ watermarkStatus: "failed", watermarkError: message })
      .where(eq(submissions.id, submissionId));
  } catch (err) {
    console.error("Failed to mark submission watermark failed", submissionId, err);
  }
};
