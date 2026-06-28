import { z } from "zod";

// Text fields that accompany the `pdf` file on the migration multipart create.
// The file itself is validated separately (see `lib/pdf-upload.ts`). Values
// arrive as strings. Lookups (department/semester/course/exam type) are
// resolved or created by name; the department short name is auto-generated from
// the department name on the server. The contributor is find-or-created by email.
export const migrationSubmissionForm = z.object({
  legacyId: z.string().trim().min(1).max(100),
  departmentName: z.string().trim().min(1).max(100),
  semesterName: z.string().trim().min(1).max(100),
  courseName: z.string().trim().min(1).max(100),
  examTypeName: z.string().trim().min(1).max(100),
  contributorEmail: z.string().trim().toLowerCase().email().max(255),
  contributorUsername: z.string().trim().min(1).max(100),
  contributorName: z.string().trim().min(1).max(100),
  contributorImageUrl: z.string().trim().url().max(2048).optional(),
  section: z.string().trim().max(100).optional(),
  batch: z.string().trim().max(100).optional(),
  // When true (the default), publish directly: resolve/create the
  // department/course/semester/exam type + question and create a live
  // submission. When false, file the import into the review queue as a pending
  // manual submission attributed to the contributor — no lookups or question
  // are created. Arrives as a string on the multipart form.
  autoPublish: z.preprocess(
    (v) => (v === undefined ? true : v === "true" || v === "1" || v === true),
    z.boolean(),
  ),
});

export type MigrationSubmissionInput = z.infer<typeof migrationSubmissionForm>;
