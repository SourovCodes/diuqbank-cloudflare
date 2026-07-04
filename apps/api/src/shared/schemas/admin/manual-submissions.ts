import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { z } from "zod";

import { pageFields } from "../../utils/pagination";

export const manualSubmissionStatus = z.enum([
  "pending_review",
  "approved",
  "rejected",
]);

export const adminManualSubmissionsListQuery = z.object({
  ...pageFields,
  status: manualSubmissionStatus.optional(),
  userId: z.coerce.number().int().positive().optional(),
  departmentName: z.string().trim().min(1).max(100).optional(),
  departmentShortName: z.string().trim().min(1).max(20).optional(),
  courseName: z.string().trim().min(1).max(150).optional(),
  semesterName: z.string().trim().min(1).max(100).optional(),
  examTypeName: z.string().trim().min(1).max(100).optional(),
});

export const adminManualSubmissionUpdateSchema = z
  .object({
    departmentName: z.string().trim().min(1).max(100),
    departmentShortName: z.string().trim().min(1).max(20),
    courseName: z.string().trim().min(1).max(150),
    semesterName: z.string().trim().min(1).max(100),
    examTypeName: z.enum(ALLOWED_EXAM_TYPES),
  })
  .partial();

export const adminManualSubmissionRejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export type AdminManualSubmissionUpdateInput = z.infer<
  typeof adminManualSubmissionUpdateSchema
>;
