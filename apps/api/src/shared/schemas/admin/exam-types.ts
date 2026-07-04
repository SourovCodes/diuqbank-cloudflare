import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { z } from "zod";

import { pageFields } from "../../utils/pagination";

export const examTypeCreateSchema = z.object({
  name: z.enum(ALLOWED_EXAM_TYPES),
});

export const examTypeUpdateSchema = examTypeCreateSchema.partial();

export const examTypesListQuery = z.object({
  ...pageFields,
  search: z.string().trim().min(1).max(100).optional(),
});

export type ExamTypeCreateInput = z.infer<typeof examTypeCreateSchema>;
export type ExamTypeUpdateInput = z.infer<typeof examTypeUpdateSchema>;
export type ExamTypesListQuery = z.infer<typeof examTypesListQuery>;
