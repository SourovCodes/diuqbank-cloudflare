import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { z } from "zod";

import { pageFields } from "../../utils/pagination";
import { taxonomyName } from "../taxonomy-name";

export const manualSubmissionStatus = z.enum([
  "pending",
  "published",
  "rejected",
]);

export const adminManualSubmissionsListQuery = z.object({
  ...pageFields,
  status: manualSubmissionStatus.optional(),
  userId: z.coerce.number().int().positive().optional(),
});

// Admins can correct the uploader's metadata before approving. All fields are
// optional (partial); section/batch may be cleared by sending an empty string.
export const adminManualSubmissionUpdateSchema = z
  .object({
    departmentName: taxonomyName(100),
    courseName: taxonomyName(150),
    semesterName: taxonomyName(100),
    examTypeName: z.enum(ALLOWED_EXAM_TYPES),
    section: z.string().trim().max(100),
    batch: z.string().trim().max(100),
  })
  .partial();

export const adminManualSubmissionRejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export type AdminManualSubmissionUpdateInput = z.infer<
  typeof adminManualSubmissionUpdateSchema
>;
