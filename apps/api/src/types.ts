import type { AuthPayload } from "./lib/jwt";

/** Cloudflare bindings generated from wrangler.jsonc by `wrangler types`. */
export type Bindings = Env;

/**
 * Messages on the two throttled queues, both drained by the same consumer
 * (src/queue.ts dispatches on `kind`): watermark jobs ride `PDF_QUEUE`
 * (bounds concurrent PDF Processor load), ai-submission jobs ride
 * `GEMINI_QUEUE` (max_concurrency 1 — Gemini calls are strictly serialized).
 */
export type PdfQueueMessage =
  | { kind: "watermark"; submissionId: number }
  | { kind: "ai-submission"; autoSubmissionId: number };

/** Hono environment: bindings + context variables set by middleware. */
export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    // Set by requireAuth on protected routes.
    user: AuthPayload;
    // Set by the requestId() middleware; echoed as the X-Request-Id header.
    requestId: string;
    // Set by taxonomy dry-run merge handlers so shared write middleware skips cache bumps.
    skipTaxonomyInvalidation?: boolean;
  };
};
