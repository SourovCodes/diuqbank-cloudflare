import { z } from "zod";

import { pageFields } from "../../lib/pagination";

const watermarkStatus = z.enum(["awaiting", "completed", "failed"]);

// Text fields that accompany the `pdf` file on the multipart create. The file
// itself is validated separately (see `lib/pdf-upload.ts`). Values arrive as
// strings, hence the coercion. Every submission must have a contributor, so
// `userId` is required (an empty field coerces to NaN and fails validation).
export const submissionCreateForm = z.object({
  questionId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
  section: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(100).optional(),
});

// JSON metadata update. Every field is optional (partial); `section` and
// `batch` accept `null` to clear them. `userId` is required when present —
// a submission always has a contributor.
export const submissionUpdateSchema = z
  .object({
    questionId: z.number().int().positive(),
    userId: z.number().int().positive(),
    section: z.string().trim().max(100).nullable(),
    batch: z.string().trim().max(100).nullable(),
    watermarkStatus,
  })
  .partial();

export const submissionsListQuery = z.object({
  ...pageFields,
  questionId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  watermarkStatus: watermarkStatus.optional(),
});

export type SubmissionUpdateInput = z.infer<typeof submissionUpdateSchema>;
export type SubmissionsListQuery = z.infer<typeof submissionsListQuery>;
