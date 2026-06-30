import { z } from "zod";

import { pageFields } from "../../utils/pagination";

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
// optional (partial); section/batch may be cleared by sending an empty string.
export const adminAutoSubmissionUpdateSchema = z
  .object({
    departmentName: z.string().trim().min(1).max(100),
    departmentShortName: z.string().trim().min(1).max(20),
    courseName: z.string().trim().min(1).max(150),
    semesterName: z.string().trim().min(1).max(100),
    examTypeName: z.string().trim().min(1).max(100),
    section: z.string().trim().max(100),
    batch: z.string().trim().max(100),
  })
  .partial();

export const adminAutoSubmissionRejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export type AdminAutoSubmissionUpdateInput = z.infer<
  typeof adminAutoSubmissionUpdateSchema
>;
