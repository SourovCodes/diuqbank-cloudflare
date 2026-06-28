import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { submissions } from "../db/schema";
import { buildWatermarkText, watermarkPdf } from "../lib/pdf-processor";
import type { Bindings } from "../types";

type Params = { submissionId: number };

// Each step retries independently; results are memoized, so a failure in a
// later step never re-runs the (paid, slow) external watermark call.
const STEP_RETRIES = {
  retries: { limit: 3, delay: "2 seconds", backoff: "exponential" },
} as const;

/**
 * Durable watermarking pipeline for a submission: watermark -> persist.
 * Started from the submission routes with
 * `env.WATERMARK_WORKFLOW.create({ params: { submissionId } })`.
 * The `submissions.watermarkStatus` column is the source of truth.
 */
export class WatermarkWorkflow extends WorkflowEntrypoint<Bindings, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<void> {
    const env = this.env;
    const { submissionId } = event.payload;
    const db = getDb(env.DB);

    try {
      // 1. Watermark the current PDF. Memoized — a retry of a later step won't
      //    re-call the external service. Returns null when there is nothing to
      //    do (submission deleted, or already watermarked on a prior run).
      const result = await step.do("watermark", STEP_RETRIES, async () => {
        const row = await db.query.submissions.findFirst({
          where: eq(submissions.id, submissionId),
          columns: { pdfKey: true, watermarkedPdfKey: true },
          with: { user: { columns: { name: true } } },
        });
        // Submission was deleted between enqueue and run — nothing to do.
        if (!row) return null;
        // Already watermarked (e.g. retry after the persist step) — idempotent.
        if (row.watermarkedPdfKey) {
          return { processedPdfKey: row.pdfKey, watermarkedKey: row.watermarkedPdfKey };
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
        return { processedPdfKey: row.pdfKey, watermarkedKey };
      });

      if (!result) return;

      // 2. Record the result. The `pdf_key` guard means a run superseded by a
      //    PDF replace (PUT .../pdf) is a harmless no-op; its object is left
      //    orphaned for manual cleanup rather than overwriting the new file.
      await step.do("persist", async () => {
        await db
          .update(submissions)
          .set({
            watermarkedPdfKey: result.watermarkedKey,
            watermarkStatus: "completed",
            watermarkError: null,
          })
          .where(
            and(
              eq(submissions.id, submissionId),
              eq(submissions.pdfKey, result.processedPdfKey),
            ),
          );
      });
    } catch (err) {
      // Reflect a terminal failure on the row so an admin can re-upload to retry.
      const message = err instanceof Error ? err.message : "Watermarking failed";
      await step.do("mark-failed", async () => {
        await db
          .update(submissions)
          .set({ watermarkStatus: "failed", watermarkError: message })
          .where(eq(submissions.id, submissionId));
      });
      throw err;
    }
  }
}
