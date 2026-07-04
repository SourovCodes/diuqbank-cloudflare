import { z } from "zod";

import { pageFields } from "../../utils/pagination";
import { taxonomyName } from "../taxonomy-name";

export const autoSubmissionStatus = z.enum([
  "processing",
  "needs_review",
  "published",
  "rejected",
  "failed",
]);

export const adminAutoSubmissionsListQuery = z.object({
  ...pageFields,
  status: autoSubmissionStatus.optional(),
  userId: z.coerce.number().int().positive().optional(),
});

// Admins can correct the AI-extracted metadata before approving. All fields are
// optional (partial); section/batch/extraContext may be cleared by sending an
// empty string.
export const adminAutoSubmissionUpdateSchema = z
  .object({
    departmentName: taxonomyName(100),
    departmentShortName: taxonomyName(20),
    courseName: taxonomyName(150),
    semesterName: taxonomyName(100),
    examTypeName: taxonomyName(100),
    section: z.string().trim().max(100),
    batch: z.string().trim().max(100),
    extraContext: z.string().trim().max(1000),
  })
  .partial();

export const adminAutoSubmissionRejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export type AdminAutoSubmissionUpdateInput = z.infer<
  typeof adminAutoSubmissionUpdateSchema
>;
