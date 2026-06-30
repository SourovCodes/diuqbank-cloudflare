import { markAutoFailed, runAutoExtraction } from "./lib/auto-submission";
import { markWatermarkFailed, runWatermark } from "./lib/pdf-processor";
import type { Bindings, PdfQueueMessage } from "./types";

// After this many delivery attempts we stop retrying and mark the row's terminal
// failure state (instead of letting the message bounce to the dead-letter queue
// unnoticed). Keep aligned with `max_retries` in wrangler.jsonc.
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_SECONDS = 10;

/**
 * Consumer for the single throttled `PDF_QUEUE`. Its `max_concurrency` caps how
 * many of these run at once, which is what bounds concurrent load on the
 * external PDF Processor (every compress/watermark call originates here).
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
