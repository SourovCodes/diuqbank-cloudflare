import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { z } from "zod";

import { pageFields } from "../utils/pagination";
import { taxonomyName } from "./taxonomy-name";

// Multipart text fields. The `pdf` file is parsed and magic-byte validated
// separately by `parsePdfFile`.
export const manualSubmissionCreateForm = z.object({
  departmentName: taxonomyName(100),
  departmentShortName: taxonomyName(20),
  courseName: taxonomyName(150),
  semesterName: taxonomyName(100),
  examTypeName: z.enum(ALLOWED_EXAM_TYPES),
  note: z.string().trim().max(1000).optional(),
});

export const manualSubmissionsListQuery = z.object({
  ...pageFields,
});
