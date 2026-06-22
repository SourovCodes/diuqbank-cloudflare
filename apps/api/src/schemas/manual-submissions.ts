import { z } from "zod";

import { pageFields } from "../lib/pagination";

// Multipart text fields. The `pdf` file is parsed and magic-byte validated
// separately by `parsePdfFile`.
export const manualSubmissionCreateForm = z.object({
  departmentId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive(),
  semesterId: z.coerce.number().int().positive(),
  examTypeId: z.coerce.number().int().positive(),
});

export const manualSubmissionsListQuery = z.object({
  ...pageFields,
});
