import { z } from "zod";

import { pageFields } from "../utils/pagination";

// Multipart text fields for an AI auto-submission. The `pdf` file is parsed and
// magic-byte validated separately by `parsePdfFile`. The user supplies no
// metadata — only an optional free-text hint to help the model resolve
// ambiguity (e.g. "this is from the CSE department, Spring 2025").
export const autoSubmissionCreateForm = z.object({
  extraContext: z.string().trim().max(1000).optional(),
});

export const autoSubmissionsListQuery = z.object({
  ...pageFields,
});
