import { z } from "zod";

import { pageFields } from "../../lib/pagination";

export const manualSubmissionStatus = z.enum([
  "pending_review",
  "approved",
  "rejected",
]);

const id = z.number().int().positive();

export const adminManualSubmissionsListQuery = z.object({
  ...pageFields,
  status: manualSubmissionStatus.optional(),
  userId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  semesterId: z.coerce.number().int().positive().optional(),
  examTypeId: z.coerce.number().int().positive().optional(),
});

export const adminManualSubmissionUpdateSchema = z
  .object({
    departmentId: id,
    courseId: id,
    semesterId: id,
    examTypeId: id,
  })
  .partial();

export const adminManualSubmissionRejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export type AdminManualSubmissionUpdateInput = z.infer<
  typeof adminManualSubmissionUpdateSchema
>;
