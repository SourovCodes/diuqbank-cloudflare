import { z } from "zod";

import { pageFields } from "../utils/pagination";

// Multipart text fields. The `pdf` file is parsed and magic-byte validated
// separately by `parsePdfFile`.
export const manualSubmissionCreateForm = z.object({
  departmentName: z.string().trim().min(1).max(100),
  departmentShortName: z.string().trim().min(1).max(20),
  courseName: z.string().trim().min(1).max(150),
  semesterName: z.string().trim().min(1).max(100),
  examTypeName: z.string().trim().min(1).max(100),
});

export const manualSubmissionsListQuery = z.object({
  ...pageFields,
});
