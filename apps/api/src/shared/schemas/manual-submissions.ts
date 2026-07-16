import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { z } from "zod";

import { pageFields } from "../utils/pagination";
import { taxonomyName } from "./taxonomy-name";

// Multipart text fields for a manual submission. The `pdf` file is parsed and
// magic-byte validated separately by `parsePdfFile`. The taxonomy fields are
// free text — the UI suggests existing values, but new ones are allowed and
// simply require an admin to create the entity before the row can be approved.
// Exam types are a closed platform-wide set, so that field is enum-checked.
export const manualSubmissionCreateForm = z.object({
  departmentName: taxonomyName(100),
  courseName: taxonomyName(150),
  semesterName: taxonomyName(100),
  examTypeName: z.enum(ALLOWED_EXAM_TYPES),
  section: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(100).optional(),
});

export const manualSubmissionsListQuery = z.object({
  ...pageFields,
});
