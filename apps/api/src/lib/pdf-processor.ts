import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { submissions } from "../db/schema";
import type { Bindings } from "../types";

/** Max length the PDF Processor accepts for the `watermark_text` field. */
const MAX_WATERMARK_TEXT = 255;

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
 * Kick off the durable watermarking Workflow for a submission that is at
 * `watermarkStatus = "awaiting"`. Never throws: if the binding fails, the row
 * is flipped to `failed` so the stuck state is visible (and recoverable via a
 * PDF re-upload) rather than silently stranded at `awaiting`.
 */
export const startWatermark = async (
  env: Bindings,
  submissionId: number,
): Promise<void> => {
  try {
    await env.WATERMARK_WORKFLOW.create({ params: { submissionId } });
  } catch (err) {
    console.error("WATERMARK_WORKFLOW.create failed", submissionId, err);
    const message =
      err instanceof Error ? err.message : "Failed to start watermarking";
    try {
      await getDb(env.DB)
        .update(submissions)
        .set({ watermarkStatus: "failed", watermarkError: message })
        .where(eq(submissions.id, submissionId));
    } catch (updateErr) {
      console.error(
        "Failed to mark submission watermark failed",
        submissionId,
        updateErr,
      );
    }
  }
};
