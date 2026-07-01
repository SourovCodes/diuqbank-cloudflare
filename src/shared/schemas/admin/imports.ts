import { z } from "zod";

// One click imports up to `limit` (default 10) not-yet-imported legacy
// submissions into the auto-submission pipeline. Capped so a single request
// stays bounded (each item is a PDF download + Gemini enqueue).
export const adminImportAutoSubmissionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(10),
});
