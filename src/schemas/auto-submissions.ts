import { z } from "zod";

import { pageFields } from "../lib/pagination";

export const autoSubmissionsListQuery = z.object({
  ...pageFields,
});

// Optional free-text hint the uploader supplies to steer a re-extraction.
export const autoSubmissionReprocessSchema = z.object({
  extraContext: z.string().trim().max(1000).optional(),
});

export type AutoSubmissionReprocessInput = z.infer<typeof autoSubmissionReprocessSchema>;
