import type { AuthPayload } from "./lib/jwt";

/** Cloudflare bindings generated from wrangler.jsonc by `wrangler types`. */
export type Bindings = Env;

/**
 * Messages on the throttled `PDF_QUEUE` (its max_concurrency bounds concurrent
 * load on the external PDF Processor). The `kind` discriminator is kept so
 * stale messages from removed pipelines can be recognized and dropped.
 */
export type PdfQueueMessage = { kind: "watermark"; submissionId: number };

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
