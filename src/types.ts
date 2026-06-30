import type { AuthPayload } from "./lib/jwt";

/** Cloudflare bindings generated from wrangler.jsonc by `wrangler types`. */
export type Bindings = Env;

/**
 * Messages on the single throttled `PDF_QUEUE`. Every call to the external
 * PDF Processor (compress + watermark) flows through this one queue so the
 * consumer's `max_concurrency` bounds total concurrent load on the service.
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
