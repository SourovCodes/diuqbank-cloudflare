import { z } from "zod";

import { pageFields } from "../../utils/pagination";

export const semesterCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const semesterUpdateSchema = semesterCreateSchema.partial();

export const semestersListQuery = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(100).optional(),
});

export type SemesterCreateInput = z.infer<typeof semesterCreateSchema>;
export type SemesterUpdateInput = z.infer<typeof semesterUpdateSchema>;
export type SemestersListQuery = z.infer<typeof semestersListQuery>;
