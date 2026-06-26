import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import { autoSubmissions } from "../db/schema";
import { buildVocab, extractQuestionMetadata } from "../lib/ai-extraction";
import { compressPdf } from "../lib/pdf-processor";
import type { Bindings } from "../types";

type Params = { autoSubmissionId: number };

// Each step retries independently; results are memoized, so a failure in a
// later step never re-runs an earlier (paid) one.
const STEP_RETRIES = {
  retries: { limit: 3, delay: "2 seconds", backoff: "exponential" },
} as const;

/**
 * Durable extraction pipeline for an auto submission: compress -> extract -> persist.
 * Started from the route with `env.AUTO_SUBMISSION_WORKFLOW.create({ params: { autoSubmissionId } })`.
 * The `auto_submissions` row is the source of truth the client polls.
 */
export class AutoSubmissionWorkflow extends WorkflowEntrypoint<Bindings, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<void> {
    const env = this.env;
    const { autoSubmissionId } = event.payload;
    const db = getDb(env.DB);

    try {
      // 1. Compress the original PDF for the AI. Reuse an existing compressed
      //    copy (e.g. on reprocess) instead of paying for compression again.
      const compressedKey = await step.do(
        "compress",
        STEP_RETRIES,
        async () => {
          const [row] = await db
            .select({
              pdfKey: autoSubmissions.pdfKey,
              compressedPdfKey: autoSubmissions.compressedPdfKey,
            })
            .from(autoSubmissions)
            .where(eq(autoSubmissions.id, autoSubmissionId))
            .limit(1);
          if (!row) throw new Error(`auto_submission ${autoSubmissionId} not found`);
          if (row.compressedPdfKey) return row.compressedPdfKey;

          const original = await env.BUCKET.get(row.pdfKey);
          if (!original) throw new Error("Original PDF missing from storage");

          const compressed = await compressPdf(env, await original.arrayBuffer());
          const key = `auto-submissions/${crypto.randomUUID()}-compressed.pdf`;
          await env.BUCKET.put(key, compressed, {
            httpMetadata: { contentType: "application/pdf" },
          });
          await db
            .update(autoSubmissions)
            .set({ compressedPdfKey: key, updatedAt: sql`(unixepoch())` })
            .where(eq(autoSubmissions.id, autoSubmissionId));
          return key;
        },
      );

      // 2. Extract metadata with Gemini. Memoized — a later failure won't
      //    re-call (and re-bill) the model.
      const extraction = await step.do("extract", STEP_RETRIES, async () => {
        const [row] = await db
          .select({ extraContext: autoSubmissions.extraContext })
          .from(autoSubmissions)
          .where(eq(autoSubmissions.id, autoSubmissionId))
          .limit(1);
        if (!row) throw new Error(`auto_submission ${autoSubmissionId} not found`);

        const compressed = await env.BUCKET.get(compressedKey);
        if (!compressed) throw new Error("Compressed PDF missing from storage");

        const vocab = await buildVocab(db);
        return extractQuestionMetadata({
          env,
          pdfBuffer: await compressed.arrayBuffer(),
          vocab,
          extraContext: row.extraContext,
        });
      });

      // 3. Hand the result to the user for review.
      await step.do("persist", async () => {
        await db
          .update(autoSubmissions)
          .set({
            aiResult: JSON.stringify(extraction),
            status: "awaiting_confirmation",
            errorMessage: null,
            updatedAt: sql`(unixepoch())`,
          })
          .where(
            and(
              eq(autoSubmissions.id, autoSubmissionId),
              eq(autoSubmissions.status, "processing"),
            ),
          );
      });
    } catch (err) {
      // Reflect a terminal failure in the row so the user can reprocess.
      const message = err instanceof Error ? err.message : "Extraction failed";
      await step.do("mark-failed", async () => {
        await db
          .update(autoSubmissions)
          .set({
            status: "failed",
            errorMessage: message,
            updatedAt: sql`(unixepoch())`,
          })
          .where(eq(autoSubmissions.id, autoSubmissionId));
      });
      throw err;
    }
  }
}
