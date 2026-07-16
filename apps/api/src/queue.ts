import { eq } from "drizzle-orm";

import { getDb } from "./db/client";
import { submissions } from "./db/schema";
import { markAutoFailed, runAutoExtraction } from "./lib/auto-submission";
import { invalidateSubmissionEdit } from "./lib/cache";
import { markWatermarkFailed, runWatermark } from "./lib/pdf-processor";
import type { Bindings, PdfQueueMessage } from "./types";

// After this many delivery attempts we stop retrying and mark the row's terminal
// failure state (instead of letting the message bounce to the dead-letter queue
// unnoticed). Keep aligned with `max_retries` in wrangler.jsonc.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_SECONDS = 10;

/**
 * Shared consumer for both throttled queues: `PDF_QUEUE` (watermark; its
 * max_concurrency bounds concurrent PDF Processor load) and `GEMINI_QUEUE`
 * (ai-submission; max_concurrency 1 so Gemini calls never overlap). Messages
 * carry a `kind` discriminator, so no per-queue branching is needed here.
 */
export const handleQueue = async (
  batch: MessageBatch<PdfQueueMessage>,
  env: Bindings,
): Promise<void> => {
  for (const message of batch.messages) {
    const body = message.body;
    try {
      if (body.kind === "watermark") {
        await runWatermark(env, body.submissionId);
        // The watermarked PDF is now the public download — refresh the caches
        // that surface this submission's pdfUrl.
        const row = await getDb(env.DB).query.submissions.findFirst({
          where: eq(submissions.id, body.submissionId),
          columns: { questionId: true },
          with: { user: { columns: { username: true } } },
        });
        if (row?.user) {
          await invalidateSubmissionEdit(env, row.questionId, row.user.username);
        }
      } else {
        await runAutoExtraction(env, body.autoSubmissionId);
      }
      message.ack();
    } catch (err) {
      console.error("PDF_QUEUE message failed", body, err);
      const detail = err instanceof Error ? err.message : "Processing failed";

      if (message.attempts >= MAX_ATTEMPTS) {
        // Retries exhausted — record the terminal failure and ack so it doesn't
        // loop. (The dead-letter queue remains a backstop for unhandled cases.)
        if (body.kind === "watermark") {
          await markWatermarkFailed(env, body.submissionId, detail);
        } else {
          await markAutoFailed(env, body.autoSubmissionId, detail);
        }
        message.ack();
      } else {
        message.retry({ delaySeconds: RETRY_DELAY_SECONDS });
      }
    }
  }
};
